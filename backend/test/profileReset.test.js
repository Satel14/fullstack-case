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
