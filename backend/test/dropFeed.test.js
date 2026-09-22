const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const respond = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler(req, res);
});

test('the drop feed carries each dropped item once, in the same shape as GET /api/item/:id', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', 'x', 'player@e.ua', 0, 0, 1)",
    );
    await sequelize.query(
        "INSERT INTO items (itemId, name, rare, colors, type, imagePath) VALUES "
        + "(707, 'AK-47 | Redline', 'Field Tested', '[]', 'rifles', '/img/items/ak.png'), "
        + "(708, 'P250 | Sand Dune', 'Battle Scarred', '[]', 'pistols', '/img/items/p250.png')",
    );
    await sequelize.query(
        "INSERT INTO insider_prices (name, pricesInCredits) VALUES "
        + "('AK-47 | Redline', JSON_QUOTE('{\"default\":120,\"painted\":150}'))",
    );
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES "
        + "(1, 707, 'default', 'dust2', 'inventory'), (1, 708, 'default', 'dust2', 'inventory'), "
        + "(1, 707, 'default', 'dust2', 'inventory')",
    );

    const managerPath = require.resolve('../src/redis/manager');
    require.cache[managerPath] = {
        id: managerPath,
        filename: managerPath,
        loaded: true,
        exports: { getAllDataHashWithKey: async () => ({}) },
    };

    const StorageController = require('../src/controllers/storage');
    const ItemController = require('../src/controllers/item');

    const feed = await respond(StorageController.getStorageLastItemsWithUserInfo, { params: { limit: 40 } });
    assert.strictEqual(feed.code, 200);
    assert.strictEqual(feed.payload.data.length, 3);
    assert.deepStrictEqual(Object.keys(feed.payload.itemList).sort(), ['707', '708']);

    for (const id of [707, 708]) {
        const single = await respond(ItemController.getItemById, { params: { id } });
        assert.strictEqual(single.code, 200);
        assert.deepStrictEqual(feed.payload.itemList[id], single.payload.data, `item ${id}`);
    }
    assert.deepStrictEqual(feed.payload.itemList[707].pricesInCredits, { default: 120, painted: 150 });
    assert.strictEqual(feed.payload.itemList[708].pricesInCredits, null);
});
