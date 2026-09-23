const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

const MESSAGE = require('../src/constant/responseMessages');

const call = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler(req, res);
});

const redeem = (userId, promocode) => call(
    require('../src/controllers/promocode').usePromocode,
    { body: { promocode }, user: { profile: { user_id: userId } } },
);

const reset = (userId) => call(
    require('../src/controllers/user').resetUser,
    { body: {}, user: { profile: { user_id: userId } } },
);

const seedPlayers = async (sequelize) => {
    await sequelize.query(
        'INSERT INTO users (login, password, email, balance, `rank`, role) VALUES '
        + "('alice', 'x', 'alice@e.ua', 0, 0, 1), ('bob', 'x', 'bob@e.ua', 0, 0, 1), "
        + "('carol', 'x', 'carol@e.ua', 0, 0, 1)",
    );
};

const addPromocode = (sequelize, code, bonus, limit, usedIds = []) => sequelize.query(
    'INSERT INTO promocodes (code, description, bonus, used_ids, `limit`) VALUES (?, ?, ?, ?, ?)',
    { replacements: [code, 'gift', bonus, JSON.stringify(usedIds), limit] },
);

const usedIdsOf = async (sequelize, code) => {
    const [rows] = await sequelize.query('SELECT used_ids FROM promocodes WHERE code = ?', { replacements: [code] });
    const value = rows[0].used_ids;
    return typeof value === 'string' ? JSON.parse(value) : value;
};

const balanceOf = async (sequelize, login) => {
    const [rows] = await sequelize.query('SELECT balance FROM users WHERE login = ?', { replacements: [login] });
    return Number(rows[0].balance);
};

test('a reset does not let the player redeem a promocode they already used', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayers(sequelize);
    await addPromocode(sequelize, 'SPRING', '50', 10);

    const first = await redeem(1, 'SPRING');
    assert.ok(first.payload.balance, JSON.stringify(first.payload));
    assert.strictEqual((await reset(1)).code, 200);

    const second = await redeem(1, 'SPRING');
    assert.strictEqual(second.payload.message, MESSAGE.PROMOCODE.USED_BY_YOURSELF);
    assert.strictEqual(await balanceOf(sequelize, 'alice'), 0);
    assert.deepStrictEqual(await usedIdsOf(sequelize, 'SPRING'), [1]);
});

test('a reset does not give a single-use promocode back to anyone else', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayers(sequelize);
    await addPromocode(sequelize, 'GIFT', '100', 1);

    assert.ok((await redeem(1, 'GIFT')).payload.balance);
    assert.strictEqual((await reset(1)).code, 200);

    const carol = await redeem(3, 'GIFT');
    assert.strictEqual(carol.payload.message, MESSAGE.PROMOCODE.LIMIT_MAX);
    assert.strictEqual(await balanceOf(sequelize, 'carol'), 0);
});

test('a reset leaves every promocode record untouched', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayers(sequelize);
    await addPromocode(sequelize, 'SHARED', '10', 10, [2, 1, 3]);

    assert.strictEqual((await reset(1)).code, 200);

    assert.deepStrictEqual(await usedIdsOf(sequelize, 'SHARED'), [2, 1, 3]);
});

test('a reset keeps the bonuses the player already claimed', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayers(sequelize);
    await sequelize.query("INSERT INTO bonus_history (userId, bonusId, created_at) VALUES (1, 'daily', NOW())");

    assert.strictEqual((await reset(1)).code, 200);

    const [rows] = await sequelize.query('SELECT userId, bonusId FROM bonus_history');
    assert.deepStrictEqual(rows.map((r) => [r.userId, r.bonusId]), [[1, 'daily']]);
});

const setUpRichPlayer = async (sequelize) => {
    await seedPlayers(sequelize);
    await sequelize.query('UPDATE users SET balance = 100, `rank` = 5 WHERE id = 1');
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (1, 10, 'default', 'bomj', 'inventory')",
    );
    await sequelize.query(
        'INSERT INTO balance_history (userId, type, balanceChange, extraData, created_at) '
        + "VALUES (1, 'payment', 100, '', NOW())",
    );
};

const profileOf = async (sequelize) => {
    const [[user]] = await sequelize.query('SELECT balance, `rank` FROM users WHERE id = 1');
    const [[storage]] = await sequelize.query('SELECT COUNT(*) AS n FROM storage WHERE userId = 1');
    const [[history]] = await sequelize.query('SELECT COUNT(*) AS n FROM balance_history WHERE userId = 1');
    return {
        balance: Number(user.balance),
        rank: Number(user.rank),
        items: Number(storage.n),
        history: Number(history.n),
    };
};

test('a reset that fails part-way leaves the profile exactly as it was', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await setUpRichPlayer(sequelize);

    const StorageService = require('../src/services/storage');
    const { cleanStorageUser } = StorageService;
    StorageService.cleanStorageUser = async () => { throw new Error('storage unavailable'); };
    try {
        assert.strictEqual((await reset(1)).code, 400);
    } finally {
        StorageService.cleanStorageUser = cleanStorageUser;
    }

    assert.deepStrictEqual(await profileOf(sequelize), {
        balance: 100, rank: 5, items: 1, history: 1,
    });
});

test('a reset waits for the player row before it changes anything', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await setUpRichPlayer(sequelize);
    const UserService = require('../src/services/user');

    const open = await sequelize.transaction();
    let resetting;
    try {
        await UserService.getBalanceByUserId(1, { transaction: open, lock: open.LOCK.UPDATE });

        let settled = false;
        resetting = reset(1).finally(() => { settled = true; });
        await new Promise((resolve) => setTimeout(resolve, 500));

        assert.strictEqual(settled, false, 'the reset must queue behind the transaction that holds the player row');
        assert.deepStrictEqual(await profileOf(sequelize), {
            balance: 100, rank: 5, items: 1, history: 1,
        });
    } finally {
        await open.commit();
    }

    assert.strictEqual((await resetting).code, 200);
    const after = await profileOf(sequelize);
    assert.strictEqual(after.balance, 0);
    assert.strictEqual(after.rank, 0);
    assert.strictEqual(after.items, 0);
});

const historyOf = async (sequelize, userId) => {
    const [rows] = await sequelize.query(
        'SELECT type, balanceChange FROM balance_history WHERE userId = ? ORDER BY id',
        { replacements: [userId] },
    );
    return rows.map((r) => [r.type, Number(r.balanceChange)]);
};

test('a reset keeps the balance history and records the balance it took', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await setUpRichPlayer(sequelize);

    assert.strictEqual((await reset(1)).code, 200);

    assert.deepStrictEqual(await historyOf(sequelize, 1), [['payment', 100], ['reset', -100]]);
    assert.strictEqual(await balanceOf(sequelize, 'alice'), 0);
});

test('a reset records the balance it actually removed when a credit lands while it waits', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await setUpRichPlayer(sequelize);
    const UserService = require('../src/services/user');
    const BalanceHistoryService = require('../src/services/balanceHistory');

    const sale = await sequelize.transaction();
    let resetting;
    try {
        await UserService.getBalanceByUserId(1, { transaction: sale, lock: sale.LOCK.UPDATE });
        resetting = reset(1);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await UserService.incrementBalance(50, 1, { transaction: sale });
        await BalanceHistoryService.addBalanceChange(1, 'sellitem', 50, '', { transaction: sale });
    } finally {
        await sale.commit();
    }

    assert.strictEqual((await resetting).code, 200);
    assert.deepStrictEqual(await historyOf(sequelize, 1), [['payment', 100], ['sellitem', 50], ['reset', -150]]);
    assert.strictEqual(await balanceOf(sequelize, 'alice'), 0);
});

test('the reset balance type cannot be removed while rows still use it', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { createMigrator } = require('../src/db/migrator');
    const migrator = createMigrator(sequelize, { quiet: true });
    await setUpRichPlayer(sequelize);
    assert.strictEqual((await reset(1)).code, 200);

    await assert.rejects(
        () => migrator.down({ to: '20260923000100-balance-history-reset.js' }),
        /Cannot remove reset: 1 balance_history row/,
    );

    const [type] = await sequelize.query("SHOW COLUMNS FROM balance_history WHERE Field = 'type'");
    assert.match(type[0].Type, /'reset'/);
});

test('the reset balance type is removed cleanly when nothing uses it', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { createMigrator } = require('../src/db/migrator');
    const migrator = createMigrator(sequelize, { quiet: true });

    await migrator.down({ to: '20260923000100-balance-history-reset.js' });

    const [type] = await sequelize.query("SHOW COLUMNS FROM balance_history WHERE Field = 'type'");
    assert.doesNotMatch(type[0].Type, /'reset'/);
    assert.match(type[0].Type, /'admin_adjust'/);
});

test('per-player tables are indexed by userId', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    for (const [table, columns] of [
        ['storage', ['userId', 'status']],
        ['balance_history', ['userId', 'type']],
        ['case_opens', ['userId', 'id']],
    ]) {
        const [rows] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);
        const byName = {};
        rows.forEach((r) => {
            byName[r.Key_name] = byName[r.Key_name] || [];
            byName[r.Key_name][r.Seq_in_index - 1] = r.Column_name;
        });
        assert.ok(
            Object.values(byName).some((cols) => JSON.stringify(cols) === JSON.stringify(columns)),
            `${table} has no (${columns.join(', ')}) index: ${JSON.stringify(byName)}`,
        );
    }
});

test("a reset does not lock other players' items while it waits for an open in flight", async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayers(sequelize);
    await sequelize.query(
        'INSERT INTO storage (userId, itemId, color, caseId, status) VALUES '
        + "(1, 10, 'default', 'bomj', 'inventory'), (3, 30, 'default', 'bomj', 'inventory')",
    );
    const StorageService = require('../src/services/storage');

    const open = await sequelize.transaction();
    let resetting;
    try {
        await sequelize.query(
            "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (2, 20, 'default', 'bomj', 'inventory')",
            { transaction: open },
        );
        resetting = reset(1);
        await new Promise((resolve) => setTimeout(resolve, 300));

        const sale = await sequelize.transaction();
        try {
            await sequelize.query('SET SESSION innodb_lock_wait_timeout = 1', { transaction: sale });
            const item = await StorageService.getStorageInfoById(3, 2, 'inventory', {
                transaction: sale,
                lock: sale.LOCK.UPDATE,
            });
            assert.strictEqual(item.storage_userId, 3);
        } finally {
            await sequelize.query('SET SESSION innodb_lock_wait_timeout = DEFAULT', { transaction: sale });
            await sale.commit();
        }
    } finally {
        await open.rollback();
    }

    assert.strictEqual((await resetting).code, 200);
    const [rows] = await sequelize.query('SELECT userId FROM storage ORDER BY id');
    assert.deepStrictEqual(rows.map((r) => r.userId), [3]);
});

test('a reset keeps pending withdrawals and delivered items', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayers(sequelize);
    await sequelize.query(
        'INSERT INTO storage (userId, itemId, color, caseId, extraData, status) VALUES '
        + "(1, 10, 'default', 'bomj', NULL, 'inventory'), "
        + "(1, 11, 'default', 'bomj', 'https://steamcommunity.com/tradeoffer/new/?partner=1', 'waitingtrade'), "
        + "(1, 12, 'default', 'bomj', NULL, 'received'), "
        + "(1, 13, 'default', 'bomj', NULL, 'money'), "
        + "(2, 14, 'default', 'bomj', NULL, 'inventory')",
    );

    assert.strictEqual((await reset(1)).code, 200);

    const [rows] = await sequelize.query('SELECT userId, itemId, extraData, status FROM storage ORDER BY id');
    assert.deepStrictEqual(rows.map((r) => [r.userId, r.itemId, r.extraData, r.status]), [
        [1, 11, 'https://steamcommunity.com/tradeoffer/new/?partner=1', 'waitingtrade'],
        [1, 12, null, 'received'],
        [2, 14, null, 'inventory'],
    ]);
});
