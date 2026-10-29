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

const respond = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler(req, res);
});

const seed = async (sequelize, receiveInfo) => {
    await sequelize.query(
        'INSERT INTO users (login, password, email, balance, `rank`, role, receiveInfo) VALUES '
        + "('trader', 'x', 'trader@e.ua', 0, 0, 1, ?)",
        { replacements: [receiveInfo] },
    );
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (1, 707, 'default', 'dust2', 'inventory')",
    );
};

const receive = (storageId) => {
    const StorageController = require('../src/controllers/storage');
    return respond(StorageController.receiveItemByStorageId, {
        params: { id: String(storageId) },
        user: { profile: { user_id: 1 } },
    });
};

const storageRow = async (sequelize) => {
    const [[row]] = await sequelize.query('SELECT status, extraData FROM storage WHERE id = 1');
    return { status: row.status, extraData: row.extraData };
};

for (const [label, receiveInfo] of [['no', null], ['a blank', '   ']]) {
    test(`a withdrawal by a user with ${label} receive info is refused and the item stays in the inventory`, async () => {
        const sequelize = await resetTestDatabase();
        activeSequelize = sequelize;
        await seed(sequelize, receiveInfo);

        const result = await receive(1);

        assert.strictEqual(result.code, 422, JSON.stringify(result.payload));
        assert.ok(MESSAGE.ITEM.RECEIVE_INFO_REQUIRED);
        assert.strictEqual(result.payload.message, MESSAGE.ITEM.RECEIVE_INFO_REQUIRED);
        assert.deepStrictEqual(await storageRow(sequelize), { status: 'inventory', extraData: null });
    });
}

test('a withdrawal by a user with receive info parks the item for the trader with that info', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize, 'steam:abc, evenings');

    const result = await receive(1);

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.deepStrictEqual(await storageRow(sequelize), { status: 'waitingtrade', extraData: 'steam:abc, evenings' });
});

test('a withdrawal of an item that is not in the inventory is refused', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize, 'steam:abc');
    await sequelize.query("UPDATE storage SET status = 'money' WHERE id = 1");

    const result = await receive(1);

    assert.strictEqual(result.code, 422, JSON.stringify(result.payload));
    assert.strictEqual(result.payload.message, MESSAGE.ITEM.NOT_IN_INVENTORY);
    assert.deepStrictEqual(await storageRow(sequelize), { status: 'money', extraData: null });
});

const cancel = (storageId, userId = 1) => {
    const StorageController = require('../src/controllers/storage');
    return respond(StorageController.cancelWithdrawalByStorageId, {
        params: { id: String(storageId) },
        user: { profile: { user_id: userId } },
    });
};

test('a withdrawal tells the player when it completes', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize, 'steam:abc');
    const before = Date.now();

    const result = await receive(1);

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    const completes = Date.parse(result.payload.completesAt);
    assert.ok(completes >= before + 70000 && completes <= Date.now() + 70000, result.payload.completesAt);
    const serverNow = Date.parse(result.payload.serverNow);
    assert.ok(serverNow >= before && serverNow <= Date.now(), result.payload.serverNow);
});

test('the player inventory list carries the server clock for countdowns', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize, 'steam:abc');
    const StorageController = require('../src/controllers/storage');
    const before = Date.now();

    const listed = await respond(StorageController.getProfileStorage, {
        body: { status: 'inventory', limit: 10 },
        user: { profile: { user_id: 1 } },
    });

    assert.strictEqual(listed.code, 200);
    assert.strictEqual(listed.payload.data.length, 1);
    const serverNow = Date.parse(listed.payload.serverNow);
    assert.ok(serverNow >= before && serverNow <= Date.now(), listed.payload.serverNow);
});

test('cancelling a pending withdrawal returns the item to the inventory and forgets the trade contact', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize, 'steam:abc');
    await receive(1);

    const result = await cancel(1);

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.deepStrictEqual(await storageRow(sequelize), { status: 'inventory', extraData: null });
});

test('a withdrawal that is not pending cannot be cancelled', async () => {
    const notPending = MESSAGE.ITEM.WITHDRAW_NOT_PENDING;
    assert.ok(notPending);

    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize, 'steam:abc');
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('other', 'x', 'o@e.ua', 0, 0, 1)",
    );

    const notRequested = await cancel(1);
    assert.strictEqual(notRequested.code, 422);
    assert.strictEqual(notRequested.payload.message, notPending);

    await receive(1);
    const byAnotherPlayer = await cancel(1, 2);
    assert.strictEqual(byAnotherPlayer.code, 422);
    assert.strictEqual((await storageRow(sequelize)).status, 'waitingtrade');

    await cancel(1);
    const twice = await cancel(1);
    assert.strictEqual(twice.code, 422);

    await receive(1);
    await sequelize.query("UPDATE storage SET status = 'received' WHERE id = 1");
    const received = await cancel(1);
    assert.strictEqual(received.code, 422);
    assert.strictEqual((await storageRow(sequelize)).status, 'received');
});

test('a pending withdrawal cannot be sold', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize, 'steam:abc');
    await receive(1);

    const StorageController = require('../src/controllers/storage');
    const sold = await respond(StorageController.sellItemByStorageId, {
        params: { id: '1' },
        user: { profile: { user_id: 1 } },
    });

    assert.strictEqual(sold.code, 422, JSON.stringify(sold.payload));
    assert.strictEqual(sold.payload.message, MESSAGE.ITEM.NOT_IN_INVENTORY);
    assert.strictEqual((await storageRow(sequelize)).status, 'waitingtrade');
});

test('another player can neither withdraw nor sell an item that is not theirs', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize, 'steam:abc');
    await sequelize.query(
        'INSERT INTO users (login, password, email, balance, `rank`, role, receiveInfo) VALUES '
        + "('stranger', 'x', 'stranger@e.ua', 0, 0, 1, 'steam:stranger')",
    );
    await sequelize.query(
        "INSERT INTO items (itemId, name, rare, colors, type, imagePath) VALUES "
        + "(707, 'AK-47 | Redline', 'Field Tested', '[]', 'rifles', '/img/items/ak.png')",
    );
    await sequelize.query(
        "INSERT INTO insider_prices (name, pricesInCredits) VALUES ('AK-47 | Redline', JSON_QUOTE('{\"default\":120,\"painted\":150}'))",
    );
    const StorageController = require('../src/controllers/storage');
    const asStranger = { params: { id: '1' }, user: { profile: { user_id: 2 } } };

    const withdrawn = await respond(StorageController.receiveItemByStorageId, asStranger);
    const sold = await respond(StorageController.sellItemByStorageId, asStranger);

    assert.deepStrictEqual([withdrawn.code, withdrawn.payload.message], [422, MESSAGE.ITEM.NOT_IN_INVENTORY]);
    assert.deepStrictEqual([sold.code, sold.payload.message], [422, MESSAGE.ITEM.NOT_IN_INVENTORY]);
    assert.deepStrictEqual(await storageRow(sequelize), { status: 'inventory', extraData: null });
    const [balances] = await sequelize.query('SELECT login, balance FROM users ORDER BY id');
    assert.deepStrictEqual(balances.map((row) => [row.login, Number(row.balance)]), [['trader', 0], ['stranger', 0]]);
});

test('a cancel racing the sweep always ends in exactly one state', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize, 'steam:abc');
    const Storage = require('../src/models/storage');
    const WithdrawalService = require('../src/services/withdrawal');

    for (let round = 0; round < 20; round += 1) {
        // eslint-disable-next-line no-await-in-loop
        await Storage.update(
            { storage_status: 'waitingtrade', storage_extraData: 'steam:abc', updated_at: new Date(Date.now() - 61000) },
            { where: { storage_id: 1 } },
        );
        const sweepFirst = round % 2 === 1;
        const delayed = (fn) => new Promise((resolve) => { setTimeout(resolve, 5); }).then(fn);
        // eslint-disable-next-line no-await-in-loop
        const [cancelled, completed] = await Promise.all([
            sweepFirst ? delayed(() => cancel(1)) : cancel(1),
            sweepFirst ? WithdrawalService.completeDue() : delayed(() => WithdrawalService.completeDue()),
        ]);
        // eslint-disable-next-line no-await-in-loop
        const row = await storageRow(sequelize);
        if (cancelled.code === 200) {
            assert.strictEqual(completed, 0, `round ${round}: both the cancel and the sweep won`);
            assert.deepStrictEqual(row, { status: 'inventory', extraData: null }, `round ${round}`);
        } else {
            assert.strictEqual(cancelled.code, 422, `round ${round}: ${JSON.stringify(cancelled.payload)}`);
            assert.strictEqual(completed, 1, `round ${round}`);
            assert.strictEqual(row.status, 'received', `round ${round}`);
        }
    }
    const [[{ n }]] = await sequelize.query('SELECT COUNT(*) AS n FROM storage');
    assert.strictEqual(Number(n), 1);
});

const withinMs = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) => { setTimeout(() => reject(new Error(`still waiting after ${ms} ms`)), ms); }),
]);

test('the sweep skips an item a cancel already holds instead of waiting for it or deadlocking with it', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize, 'steam:abc');
    const Storage = require('../src/models/storage');
    const StorageService = require('../src/services/storage');
    const WithdrawalService = require('../src/services/withdrawal');
    await Storage.update(
        { storage_status: 'waitingtrade', storage_extraData: 'steam:abc', updated_at: new Date(Date.now() - 61000) },
        { where: { storage_id: 1 } },
    );

    const holder = await sequelize.transaction();
    try {
        await StorageService.getStorageInfoById(1, 1, 'waitingtrade', { transaction: holder, lock: holder.LOCK.UPDATE });

        assert.strictEqual(await withinMs(WithdrawalService.completeDue(), 3000), 0);

        await StorageService.setStorageStatusById(1, 'inventory', { transaction: holder });
        await StorageService.setStorageExtraDataById(1, null, { transaction: holder });
        await holder.commit();
    } catch (e) {
        await holder.rollback().catch(() => {});
        throw e;
    }

    assert.deepStrictEqual(await storageRow(sequelize), { status: 'inventory', extraData: null });
});

test('one held item does not stop the sweep from completing the others', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize, 'steam:abc');
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (1, 707, 'default', 'dust2', 'inventory')",
    );
    const Storage = require('../src/models/storage');
    const WithdrawalService = require('../src/services/withdrawal');
    await Storage.update(
        { storage_status: 'waitingtrade', storage_extraData: 'steam:abc', updated_at: new Date(Date.now() - 61000) },
        { where: {} },
    );

    const holder = await sequelize.transaction();
    try {
        await Storage.findOne({ where: { storage_id: 1 }, transaction: holder, lock: holder.LOCK.UPDATE });
        assert.strictEqual(await withinMs(WithdrawalService.completeDue(), 3000), 1);
    } finally {
        await holder.commit();
    }

    const [rows] = await sequelize.query('SELECT id, status FROM storage ORDER BY id');
    assert.deepStrictEqual(rows.map((r) => [r.id, r.status]), [[1, 'waitingtrade'], [2, 'received']]);
    assert.strictEqual(await WithdrawalService.completeDue(), 1, 'the next sweep picks up the item once it is free');
});
