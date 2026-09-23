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
    assert.strictEqual(result.payload.message, MESSAGE.ITEM.NOT_EXIST);
    assert.deepStrictEqual(await storageRow(sequelize), { status: 'money', extraData: null });
});
