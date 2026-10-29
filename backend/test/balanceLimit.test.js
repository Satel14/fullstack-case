const test = require('node:test');
const assert = require('node:assert');
const util = require('util');
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
const { BALANCE_MAX } = require('../src/constant/mysql');

const NEAR_THE_TOP = '9999999990.00';

const respond = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler(req, res);
});

const quietly = async (fn) => {
    const lines = [];
    const originals = ['log', 'info', 'warn', 'error'].map((level) => [level, console[level]]);
    originals.forEach(([level]) => { console[level] = (...args) => { lines.push(util.format(...args)); }; });
    try {
        return { result: await fn(), lines };
    } finally {
        originals.forEach(([level, original]) => { console[level] = original; });
    }
};

const freshDatabase = async (players) => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    for (const [login, balance, role = 1] of players) {
        await sequelize.query(
            'INSERT INTO users (login, password, email, balance, `rank`, role) VALUES (?, ?, ?, ?, 0, ?)',
            { replacements: [login, 'x', `${login}@e.ua`, balance, role] },
        );
    }
    return sequelize;
};

const ledger = async (sequelize) => {
    const [users] = await sequelize.query('SELECT login, balance FROM users ORDER BY id');
    const [[{ history }]] = await sequelize.query('SELECT COUNT(*) AS history FROM balance_history');
    return { balances: users.map((row) => [row.login, String(row.balance)]), history: Number(history) };
};

const asPlayer = (id, extra = {}) => ({ user: { profile: { user_id: id } }, ...extra });

test('the largest balance is the most the users.balance column holds', async () => {
    const sequelize = await freshDatabase([]);
    const [[column]] = await sequelize.query(
        "SELECT NUMERIC_PRECISION AS digits, NUMERIC_SCALE AS decimals FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'balance'",
    );
    const decimals = Number(column.decimals);

    assert.strictEqual(BALANCE_MAX.toFixed(decimals), `${'9'.repeat(Number(column.digits) - decimals)}.${'9'.repeat(decimals)}`);
});

test('a credit too small to change the stored balance is not taken for a full balance', async () => {
    const sequelize = await freshDatabase([['player', '100.29']]);
    const UserService = require('../src/services/user');

    for (const value of [0, 0.004, 5e-7]) {
        await sequelize.transaction((transaction) => UserService.incrementBalance(value, 1, { transaction }));
    }

    assert.deepStrictEqual((await ledger(sequelize)).balances, [['player', '100.29']]);
});

test('a credit of nothing at the largest balance is not refused', async () => {
    const sequelize = await freshDatabase([['player', '9999999999.99']]);
    const UserService = require('../src/services/user');

    await sequelize.transaction((transaction) => UserService.incrementBalance(0, 1, { transaction }));

    assert.deepStrictEqual((await ledger(sequelize)).balances, [['player', '9999999999.99']]);
});

test('a credit outside a transaction is refused before it touches the balance', async () => {
    const sequelize = await freshDatabase([['player', '100.00']]);
    const UserService = require('../src/services/user');

    await assert.rejects(UserService.incrementBalance(10, 1), /needs a transaction/);
    await assert.rejects(UserService.incrementBalance(10, 1, {}), /needs a transaction/);

    assert.deepStrictEqual((await ledger(sequelize)).balances, [['player', '100.00']]);
});

test('a credit to a player who does not exist is refused', async () => {
    const sequelize = await freshDatabase([['player', '100.00']]);
    const UserService = require('../src/services/user');

    await assert.rejects(
        sequelize.transaction((transaction) => UserService.incrementBalance(10, 99, { transaction })),
        { message: MESSAGE.USER.NOT_EXIST },
    );
});

const waitingTransactions = async (sequelize, transaction, count) => {
    let waiting = [];
    for (let attempt = 0; attempt < 50 && waiting.length < count; attempt += 1) {
        await new Promise((resolve) => { setTimeout(resolve, 50); });
        [waiting] = await sequelize.query(
            "SELECT trx_id FROM information_schema.innodb_trx WHERE trx_state = 'LOCK WAIT' "
            + 'AND trx_mysql_thread_id IN (SELECT id FROM information_schema.processlist WHERE db = DATABASE())',
            { transaction },
        );
    }
    return waiting.length;
};

test('two deposits that would pass the largest balance together: one goes through, the other is refused', async () => {
    const sequelize = await freshDatabase([['player', '9999999849.99']]);
    const { depositBalance } = require('../src/controllers/user');

    const { result: results, lines } = await quietly(async () => {
        const holder = await sequelize.transaction();
        let deposits;
        try {
            await sequelize.query('SELECT id FROM users WHERE id = 1 FOR UPDATE', { transaction: holder });
            deposits = Promise.all([
                respond(depositBalance, asPlayer(1, { body: { amount: 100 } })),
                respond(depositBalance, asPlayer(1, { body: { amount: 100 } })),
            ]);
            assert.strictEqual(await waitingTransactions(sequelize, holder, 2), 2, 'the deposits never waited for the player row together');
        } finally {
            await holder.commit();
            await deposits;
        }
        return deposits;
    });

    assert.deepStrictEqual(results.map((r) => r.code).sort(), [200, 422]);
    assert.strictEqual(results.find((r) => r.code === 422).payload.message, MESSAGE.USER.BALANCE_LIMIT);
    assert.deepStrictEqual(await ledger(sequelize), { balances: [['player', '9999999949.99']], history: 1 });
    assert.deepStrictEqual(lines, []);
});

test('a deposit that would pass the largest balance is refused and credits nothing', async () => {
    const sequelize = await freshDatabase([['player', NEAR_THE_TOP]]);
    const before = await ledger(sequelize);

    const { result, lines } = await quietly(() => respond(
        require('../src/controllers/user').depositBalance,
        asPlayer(1, { body: { amount: 100 } }),
    ));

    assert.deepStrictEqual([result.code, result.payload.message], [422, MESSAGE.USER.BALANCE_LIMIT]);
    assert.deepStrictEqual(await ledger(sequelize), before);
    assert.deepStrictEqual(lines, []);
});

test('a deposit that lands exactly on the largest balance goes through', async () => {
    const sequelize = await freshDatabase([['player', '9999999899.99']]);

    const { result } = await quietly(() => respond(
        require('../src/controllers/user').depositBalance,
        asPlayer(1, { body: { amount: 100 } }),
    ));

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.deepStrictEqual((await ledger(sequelize)).balances, [['player', '9999999999.99']]);
});

test('a sale that would pass the largest balance is refused and the item stays in the inventory', async () => {
    const sequelize = await freshDatabase([['player', NEAR_THE_TOP]]);
    await sequelize.query(
        "INSERT INTO items (itemId, name, rare, colors, type, imagePath) VALUES (707, 'AK-47 | Redline', 'Field Tested', '[]', 'rifles', '/img/items/ak.png')",
    );
    await sequelize.query(
        "INSERT INTO insider_prices (name, pricesInCredits) VALUES ('AK-47 | Redline', JSON_QUOTE('{\"default\":120,\"painted\":150}'))",
    );
    await sequelize.query("INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (1, 707, 'default', 'dust2', 'inventory')");
    const before = await ledger(sequelize);

    const { result, lines } = await quietly(() => respond(
        require('../src/controllers/storage').sellItemByStorageId,
        asPlayer(1, { params: { id: '1' } }),
    ));

    assert.deepStrictEqual([result.code, result.payload.message], [422, MESSAGE.USER.BALANCE_LIMIT]);
    assert.deepStrictEqual(await ledger(sequelize), before);
    const [[storage]] = await sequelize.query('SELECT status FROM storage WHERE id = 1');
    assert.strictEqual(storage.status, 'inventory');
    assert.deepStrictEqual(lines, []);
});

test('a bonus that would pass the largest balance is refused and stays unclaimed', async () => {
    const sequelize = await freshDatabase([['player', NEAR_THE_TOP]]);
    const before = await ledger(sequelize);

    const { result, lines } = await quietly(() => respond(
        require('../src/controllers/bonusHistory').activateBonus,
        asPlayer(1, { body: { bonusId: 'welcome' } }),
    ));

    assert.deepStrictEqual([result.code, result.payload.message], [422, MESSAGE.USER.BALANCE_LIMIT]);
    assert.deepStrictEqual(await ledger(sequelize), before);
    const [[{ claims }]] = await sequelize.query('SELECT COUNT(*) AS claims FROM bonus_history');
    assert.strictEqual(Number(claims), 0);
    assert.deepStrictEqual(lines, []);
});

test('a promocode that would pass the largest balance is refused and stays unused', async () => {
    const sequelize = await freshDatabase([['player', NEAR_THE_TOP]]);
    await sequelize.query(
        'INSERT INTO promocodes (code, description, bonus, used_ids, `limit`) VALUES (?, ?, ?, ?, ?)',
        { replacements: ['GIFT', 'gift', '50', '[]', 10] },
    );
    const before = await ledger(sequelize);

    const { result, lines } = await quietly(() => respond(
        require('../src/controllers/promocode').usePromocode,
        asPlayer(1, { body: { promocode: 'GIFT' } }),
    ));

    assert.strictEqual(result.payload.message, MESSAGE.USER.BALANCE_LIMIT);
    assert.deepStrictEqual(await ledger(sequelize), before);
    const [[promocode]] = await sequelize.query("SELECT used_ids FROM promocodes WHERE code = 'GIFT'");
    const usedBy = typeof promocode.used_ids === 'string' ? JSON.parse(promocode.used_ids) : promocode.used_ids;
    assert.deepStrictEqual(usedBy, []);
    assert.deepStrictEqual(lines, []);
});

test('a transfer that would pass the recipient\'s largest balance is refused and moves nothing', async () => {
    const sequelize = await freshDatabase([['alice', '1000.00'], ['bob', NEAR_THE_TOP]]);
    const before = await ledger(sequelize);

    const { result, lines } = await quietly(() => respond(
        require('../src/controllers/user').sendMoneyForUserByUserId,
        asPlayer(1, { body: { userIdTo: 2, money_count: 100 } }),
    ));

    assert.deepStrictEqual(
        [result.code, result.payload.sended, result.payload.message],
        [422, false, MESSAGE.USER.RECIPIENT_BALANCE_LIMIT],
    );
    assert.deepStrictEqual(await ledger(sequelize), before);
    assert.deepStrictEqual(lines, []);
});

test('an admin correction that would pass the largest balance is refused and leaves no journal entry', async () => {
    const sequelize = await freshDatabase([['boss', '0.00', 10], ['rich', NEAR_THE_TOP]]);
    const before = await ledger(sequelize);

    const { result, lines } = await quietly(() => respond(
        require('../src/controllers/admin/users').adjustBalance,
        asPlayer(1, { params: { id: '2' }, body: { delta: 100, reason: 'gift' } }),
    ));

    assert.deepStrictEqual([result.code, result.payload.message], [422, MESSAGE.USER.BALANCE_LIMIT]);
    assert.deepStrictEqual(await ledger(sequelize), before);
    const [[{ actions }]] = await sequelize.query('SELECT COUNT(*) AS actions FROM admin_actions');
    assert.strictEqual(Number(actions), 0);
    assert.deepStrictEqual(lines, []);
});

test('an admin can lower a balance that sits at the largest balance', async () => {
    const sequelize = await freshDatabase([['boss', '0.00', 10], ['rich', '9999999999.99']]);

    const { result, lines } = await quietly(() => respond(
        require('../src/controllers/admin/users').adjustBalance,
        asPlayer(1, { params: { id: '2' }, body: { delta: -100, reason: 'correction' } }),
    ));

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.deepStrictEqual(await ledger(sequelize), { balances: [['boss', '0.00'], ['rich', '9999999899.99']], history: 1 });
    const [[{ actions }]] = await sequelize.query('SELECT COUNT(*) AS actions FROM admin_actions');
    assert.strictEqual(Number(actions), 1);
    assert.deepStrictEqual(lines, []);
});
