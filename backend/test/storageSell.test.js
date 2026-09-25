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

const sell = (storageId) => {
    const StorageController = require('../src/controllers/storage');
    return respond(StorageController.sellItemByStorageId, {
        params: { id: String(storageId) },
        user: { profile: { user_id: 1 } },
    });
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
    assert.deepStrictEqual(await sellOutcome(sequelize), {
        balance: 120,
        status: 'money',
        history: [['sellitem', 120]],
    });
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
