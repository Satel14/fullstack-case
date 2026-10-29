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
    id: managerPath,
    filename: managerPath,
    loaded: true,
    exports: { getAllDataHashWithKey: async () => ({}) },
};

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

const asJson = (value) => JSON.parse(JSON.stringify(value));

const seedFeed = async (sequelize, count) => {
    const range = Array.from({ length: count }, (_, i) => i + 1);
    await sequelize.query(`INSERT INTO users (login, password, email, balance, \`rank\`, role) VALUES ${
        range.map((i) => `('player${i}', 'x', 'player${i}@e.ua', 0, 0, 1)`).join(', ')}`);
    await sequelize.query(`INSERT INTO items (itemId, name, rare, colors, type, imagePath) VALUES ${
        range.map((i) => `(${700 + i}, 'Gun ${i}', 'Field Tested', '[]', 'rifles', '')`).join(', ')}`);
    await sequelize.query(`INSERT INTO insider_prices (name, pricesInCredits) VALUES ${
        range.map((i) => `('Gun ${i}', JSON_QUOTE('{"default":${i}}'))`).join(', ')}`);
    await sequelize.query(`INSERT INTO cases (id, title, price, discount, categoryId, published, img, openedCount, type, openLimit) VALUES ${
        range.map((i) => `('case${i}', 'Case ${i}', 100, 100, 1, 1, '', 0, 'default', 1000)`).join(', ')}`);
    await sequelize.query(`INSERT INTO storage (userId, itemId, color, caseId, status) VALUES ${
        range.map((i) => `(${i}, ${700 + i}, 'default', 'case${i}', 'inventory')`).join(', ')}`);
};

const countQueries = async (sequelize, work) => {
    const original = sequelize.query;
    let queries = 0;
    sequelize.query = function countedQuery(...args) {
        queries += 1;
        return original.apply(this, args);
    };
    try {
        return { result: await work(), queries };
    } finally {
        sequelize.query = original;
    }
};

test('the drop feed lists each player and case once, as the single lookups do, and null for missing ones', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedFeed(sequelize, 2);
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (99, 701, 'default', 'gone', 'inventory'), "
        + "(1, 702, 'default', 'case2', 'inventory')",
    );

    const StorageController = require('../src/controllers/storage');
    const UserService = require('../src/services/user');
    const CaseService = require('../src/services/case');

    const feed = await respond(StorageController.getStorageLastItemsWithUserInfo, { params: { limit: 40 } });

    assert.strictEqual(feed.code, 200);
    assert.strictEqual(feed.payload.data.length, 4);
    assert.deepStrictEqual(Object.keys(feed.payload.userList).sort(), ['1', '2', '99']);
    assert.deepStrictEqual(Object.keys(feed.payload.caseList).sort(), ['case1', 'case2', 'gone']);
    for (const id of [1, 2]) {
        assert.deepStrictEqual(asJson(feed.payload.userList[id]), asJson(await UserService.getUserById(id)), `user ${id}`);
    }
    for (const id of ['case1', 'case2']) {
        assert.deepStrictEqual(asJson(feed.payload.caseList[id]), asJson(await CaseService.getCaseById(id)), `case ${id}`);
    }
    assert.strictEqual(feed.payload.userList[99], null);
    assert.strictEqual(feed.payload.caseList.gone, null);
    assert.ok(!JSON.stringify(feed.payload.userList).includes('player1@e.ua'), 'no private user fields');
});

test('the number of database queries of the drop feed does not grow with the number of drops', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedFeed(sequelize, 40);

    const StorageController = require('../src/controllers/storage');
    const few = await countQueries(
        sequelize, () => respond(StorageController.getStorageLastItemsWithUserInfo, { params: { limit: 2 } }),
    );
    const many = await countQueries(
        sequelize, () => respond(StorageController.getStorageLastItemsWithUserInfo, { params: { limit: 40 } }),
    );

    assert.strictEqual(many.result.code, 200);
    assert.strictEqual(many.result.payload.data.length, 40);
    assert.strictEqual(Object.keys(many.result.payload.itemList).length, 40);
    assert.strictEqual(Object.keys(many.result.payload.userList).length, 40);
    assert.strictEqual(Object.keys(many.result.payload.caseList).length, 40);
    assert.ok(few.queries > 0, 'the queries are counted');
    assert.ok(many.queries <= 5, `${many.queries} queries for 40 drops`);
    assert.strictEqual(many.queries, few.queries);
});

test('the drop feed carries the grade of each dropped item', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', 'x', 'player@e.ua', 0, 0, 1)",
    );
    await sequelize.query(
        "INSERT INTO items (itemId, name, rare, colors, type, imagePath, grade) VALUES "
        + "(707, 'AK-47 | Redline', 'Field Tested', '[]', 'rifles', '/img/items/ak.png', 'classified'), "
        + "(708, 'P250 | Sand Dune', 'Battle Scarred', '[]', 'pistols', '/img/items/p250.png', NULL)",
    );
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES "
        + "(1, 707, 'default', 'dust2', 'inventory'), (1, 708, 'default', 'dust2', 'inventory')",
    );

    const StorageController = require('../src/controllers/storage');
    const feed = await respond(StorageController.getStorageLastItemsWithUserInfo, { params: { limit: 40 } });

    assert.strictEqual(feed.code, 200);
    assert.strictEqual(feed.payload.itemList[707].item_grade, 'classified');
    assert.strictEqual(feed.payload.itemList[708].item_grade, null);
});
