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

const respond = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler(req, res);
});

const seedSellableItem = async (sequelize) => {
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('seller', 'x', 'seller@e.ua', 0, 0, 1)",
    );
    await sequelize.query(
        "INSERT INTO items (itemId, name, rare, colors, type, imagePath) VALUES "
        + "(707, 'AK-47 | Redline', 'Field Tested', '[]', 'rifles', '/img/items/ak.png')",
    );
    await sequelize.query(
        "INSERT INTO insider_prices (name, pricesInCredits) VALUES "
        + "('AK-47 | Redline', JSON_QUOTE('{\"default\":120,\"painted\":150}'))",
    );
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (1, 707, 'default', 'dust2', 'inventory')",
    );
};

const sell = async (storageId, body = {}) => {
    const StorageController = require('../src/controllers/storage');
    const req = { params: { id: String(storageId) }, body, user: { profile: { user_id: 1 } } };
    await Promise.all(StorageController.validate('sellItemByStorageId').map((rule) => rule.run(req)));
    return respond(StorageController.sellItemByStorageId, req);
};

const withLogsCaught = async (fn) => {
    const lines = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args) => { lines.push(args.map(String).join(' ')); };
    console.error = (...args) => { lines.push(args.map(String).join(' ')); };
    try {
        return { result: await fn(), lines };
    } finally {
        console.log = originalLog;
        console.error = originalError;
    }
};

const sellOutcome = async (sequelize) => {
    const [[user]] = await sequelize.query('SELECT balance FROM users WHERE id = 1');
    const [[storage]] = await sequelize.query('SELECT status FROM storage WHERE id = 1');
    const [history] = await sequelize.query('SELECT type, balanceChange FROM balance_history WHERE userId = 1');
    return {
        balance: Number(user.balance),
        status: storage.status,
        history: history.map((r) => [r.type, Number(r.balanceChange)]),
    };
};

test('selling works on a database with no uah-credit-rate module row, at the rate of 1 the site shows', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedSellableItem(sequelize);
    await sequelize.query("DELETE FROM modules WHERE param = 'uah-credit-rate'");

    const result = await sell(1);

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.strictEqual(Number(result.payload.balance), 120);
    assert.strictEqual(result.payload.rate, 1);
    assert.deepStrictEqual(await sellOutcome(sequelize), {
        balance: 120,
        status: 'money',
        history: [['sellitem', 120]],
    });
});

test('an item whose colour has no price is refused with a message the player can read', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedSellableItem(sequelize);
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (1, 707, 'gold', 'dust2', 'inventory')",
    );
    const MESSAGE = require('../src/constant/responseMessages');

    const result = await sell(2);

    assert.strictEqual(result.code, 422);
    assert.strictEqual(result.payload.message, MESSAGE.ITEM.NO_PRICE);
    assert.match(result.payload.message, /[а-яіїєґ]/i);
    const [[storage]] = await sequelize.query('SELECT status FROM storage WHERE id = 2');
    assert.strictEqual(storage.status, 'inventory');
});

test('selling at a fractional rate pays the exact value floored to kopiyky, not a kopiyka less', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedSellableItem(sequelize);
    await sequelize.query(
        "UPDATE insider_prices SET pricesInCredits = JSON_QUOTE('{\"default\":227,\"painted\":300}') WHERE name = 'AK-47 | Redline'",
    );
    await sequelize.query("UPDATE modules SET extraData = '0.7' WHERE param = 'uah-credit-rate'");

    const result = await sell(1);

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.strictEqual(result.payload.rate, 0.7);
    assert.deepStrictEqual(await sellOutcome(sequelize), {
        balance: 158.9,
        status: 'money',
        history: [['sellitem', 158.9]],
    });
});

test('a sale sent with the rate the player saw pays at that rate and names it', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedSellableItem(sequelize);
    await sequelize.query("UPDATE modules SET extraData = '0.85' WHERE param = 'uah-credit-rate'");

    const result = await sell(1, { rate: 0.85 });

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.strictEqual(result.payload.rate, 0.85);
    assert.deepStrictEqual(await sellOutcome(sequelize), {
        balance: 102,
        status: 'money',
        history: [['sellitem', 102]],
    });
});

test('a rate written another way but equal to the current one is the same rate', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedSellableItem(sequelize);
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (1, 707, 'default', 'dust2', 'inventory')",
    );
    await sequelize.query("UPDATE modules SET extraData = '0.85' WHERE param = 'uah-credit-rate'");

    const answers = [await sell(1, { rate: '0.850' }), await sell(2, { rate: '0.85' })];

    assert.deepStrictEqual(answers.map(({ code, payload }) => [code, payload.rate]), [[200, 0.85], [200, 0.85]]);
});

const PRICE_CHANGES = [
    ['the rate fell below the full price the player saw', '0.85', 1, 0.85],
    ['the rate went back up to 1 from the one the player saw', '1', 0.85, 1],
    ['the rate differs from the one the player saw in its last digit', '0.7', 0.7001, 0.7],
    ['the rate the player sent is the current one plus float noise', '0.3', 0.1 + 0.2, 0.3],
];

for (const [what, current, seen, answered] of PRICE_CHANGES) {
    test(`a sale is refused before anything changes when ${what}, and the answer names the current rate`, async () => {
        const sequelize = await resetTestDatabase();
        activeSequelize = sequelize;
        await seedSellableItem(sequelize);
        await sequelize.query("UPDATE modules SET extraData = ? WHERE param = 'uah-credit-rate'", { replacements: [current] });
        const MESSAGE = require('../src/constant/responseMessages');

        const { result, lines } = await withLogsCaught(() => sell(1, { rate: seen }));

        assert.deepStrictEqual(
            [result.code, result.payload.message, result.payload.rate],
            [409, MESSAGE.ITEM.PRICE_CHANGED, answered],
        );
        assert.match(result.payload.message, /[а-яіїєґ]/i);
        assert.deepStrictEqual(lines, []);
        assert.deepStrictEqual(await sellOutcome(sequelize), { balance: 0, status: 'inventory', history: [] });
    });
}

test('without a module row a sale sent with another rate is refused and told the rate of 1', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedSellableItem(sequelize);
    await sequelize.query("DELETE FROM modules WHERE param = 'uah-credit-rate'");

    const result = await sell(1, { rate: 0.9 });

    assert.deepStrictEqual([result.code, result.payload.rate], [409, 1]);
    assert.deepStrictEqual(await sellOutcome(sequelize), { balance: 0, status: 'inventory', history: [] });
});

test('a sale rate that is not a positive number is refused as invalid input', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedSellableItem(sequelize);
    const MESSAGE = require('../src/constant/responseMessages');
    const crafted = [[0.85], [0.85, 'x'], 'abc', 0, -1, null, {}, true, ''];

    const answers = [];
    for (const rate of crafted) {
        answers.push(await sell(1, { rate }));
    }

    assert.deepStrictEqual(
        answers.map(({ code, payload }) => [code, payload.message]),
        crafted.map(() => [422, MESSAGE.VALIDATOR.ERROR]),
    );
    assert.deepStrictEqual(await sellOutcome(sequelize), { balance: 0, status: 'inventory', history: [] });
});

test('selling applies the uah-credit-rate module when the row exists', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedSellableItem(sequelize);
    await sequelize.query("DELETE FROM modules WHERE param = 'uah-credit-rate'");
    await sequelize.query("INSERT INTO modules (param, status, extraData) VALUES ('uah-credit-rate', 1, '1.5')");

    const result = await sell(1);

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.deepStrictEqual(await sellOutcome(sequelize), {
        balance: 180,
        status: 'money',
        history: [['sellitem', 180]],
    });
});

test('a sale locks the player before the item, so it cannot deadlock with a profile reset', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedSellableItem(sequelize);

    const holder = await sequelize.transaction();
    let sale;
    try {
        await sequelize.query('SELECT id FROM users WHERE id = 1 FOR UPDATE', { transaction: holder });
        sale = sell(1);

        let waiting = [];
        for (let attempt = 0; attempt < 50 && waiting.length === 0; attempt += 1) {
            await new Promise((resolve) => { setTimeout(resolve, 50); });
            [waiting] = await sequelize.query(
                "SELECT trx_id FROM information_schema.innodb_trx WHERE trx_state = 'LOCK WAIT' "
                + 'AND trx_mysql_thread_id IN (SELECT id FROM information_schema.processlist WHERE db = DATABASE())',
                { transaction: holder },
            );
        }
        assert.strictEqual(waiting.length, 1, 'the sale never started waiting for the player row');

        const [storageLocks] = await sequelize.query(
            "SELECT LOCK_MODE FROM performance_schema.data_locks "
            + "WHERE OBJECT_SCHEMA = DATABASE() AND OBJECT_NAME = 'storage' AND LOCK_TYPE = 'RECORD' "
            + 'AND ENGINE_TRANSACTION_ID = ?',
            { replacements: [waiting[0].trx_id], transaction: holder },
        );
        assert.deepStrictEqual(storageLocks, [], 'the sale held an item lock while waiting for the player');
    } finally {
        await holder.commit();
        await sale;
    }

    const result = await sale;
    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
});

test('selling an item twice at once sells it once and leaves nothing in the log', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedSellableItem(sequelize);

    const { result, lines } = await withLogsCaught(() => Promise.all([sell(1), sell(1), sell(1)]));

    assert.deepStrictEqual(result.map(({ code }) => code).sort(), [200, 422, 422]);
    const MESSAGE = require('../src/constant/responseMessages');
    assert.deepStrictEqual(
        result.filter(({ code }) => code === 422).map(({ payload }) => payload.message),
        [MESSAGE.ITEM.NOT_IN_INVENTORY, MESSAGE.ITEM.NOT_IN_INVENTORY],
    );
    assert.deepStrictEqual(lines, []);
    assert.deepStrictEqual((await sellOutcome(sequelize)).history, [['sellitem', 120]]);
});

test('a sale that fails for an unexpected reason is logged once', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedSellableItem(sequelize);
    const BalanceHistoryService = require('../src/services/balanceHistory');
    const original = BalanceHistoryService.addBalanceChange;
    BalanceHistoryService.addBalanceChange = async () => { throw new Error('history table gone'); };
    let outcome;
    try {
        outcome = await withLogsCaught(() => sell(1));
    } finally {
        BalanceHistoryService.addBalanceChange = original;
    }

    assert.strictEqual(outcome.result.code, 500);
    assert.strictEqual(outcome.lines.length, 1);
    assert.match(outcome.lines[0], /history table gone/);
});

test('selling an item that has already left the inventory says it is not there', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedSellableItem(sequelize);
    await sequelize.query("UPDATE storage SET status = 'money' WHERE id = 1");
    const MESSAGE = require('../src/constant/responseMessages');

    const { result, lines } = await withLogsCaught(() => sell(1));

    assert.deepStrictEqual([result.code, result.payload.message], [422, MESSAGE.ITEM.NOT_IN_INVENTORY]);
    assert.deepStrictEqual(lines, []);
    assert.deepStrictEqual(await sellOutcome(sequelize), { balance: 0, status: 'money', history: [] });
});

const UNSELLABLE = [
    ['catalogue row is gone', 'DELETE FROM items WHERE itemId = 707'],
    ['price row is gone', 'DELETE FROM insider_prices'],
    ['payout is under a kopiyka', "UPDATE insider_prices SET pricesInCredits = JSON_QUOTE('{\"default\":0.004,\"painted\":150}')"],
];

for (const [what, change] of UNSELLABLE) {
    test(`an item in the inventory whose ${what} is refused as unsellable, not as missing or a server error`, async () => {
        const sequelize = await resetTestDatabase();
        activeSequelize = sequelize;
        await seedSellableItem(sequelize);
        await sequelize.query(change);
        const MESSAGE = require('../src/constant/responseMessages');

        const { result, lines } = await withLogsCaught(() => sell(1));

        assert.deepStrictEqual([result.code, result.payload.message], [422, MESSAGE.ITEM.NO_PRICE]);
        assert.deepStrictEqual(lines, []);
        assert.deepStrictEqual(await sellOutcome(sequelize), { balance: 0, status: 'inventory', history: [] });
    });
}
