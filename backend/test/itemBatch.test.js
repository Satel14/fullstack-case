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

const call = async (handlerName, validatorName, req) => {
    const ItemController = require('../src/controllers/item');
    for (const validator of ItemController.validate(validatorName) || []) {
        await validator.run(req);
    }
    return respond(ItemController[handlerName], req);
};

const batch = (ids) => call('getItemsByIds', 'getItemsByIds', { query: ids === undefined ? {} : { ids } });
const single = (id) => call('getItemById', 'getItemById', { params: { id: String(id) } });

const seedItems = async (sequelize, count = 0) => {
    await sequelize.query(
        'INSERT INTO items (itemId, name, rare, colors, type, imagePath) VALUES '
        + "(707, 'AK-47 | Redline', 'Field Tested', '[]', 'rifles', '/img/items/ak.png'), "
        + "(708, 'P250 | Sand Dune', 'Battle Scarred', '[]', 'pistols', '/img/items/p250.png')",
    );
    await sequelize.query(
        'INSERT INTO insider_prices (name, pricesInCredits) VALUES '
        + "('AK-47 | Redline', JSON_QUOTE('{\"default\":120,\"painted\":150}'))",
    );
    if (count) {
        const rows = Array.from({ length: count }, (_, i) => `(${1000 + i}, 'Item ${i}', 'Field Tested', '[]', 'rifles', '')`);
        await sequelize.query(`INSERT INTO items (itemId, name, rare, colors, type, imagePath) VALUES ${rows.join(', ')}`);
        const prices = Array.from({ length: count }, (_, i) => `('Item ${i}', JSON_QUOTE('{"default":${i + 1}}'))`);
        await sequelize.query(`INSERT INTO insider_prices (name, pricesInCredits) VALUES ${prices.join(', ')}`);
    }
};

const countQueries = async (sequelize, work) => {
    const original = sequelize.query;
    let queries = 0;
    sequelize.query = function countedQuery(...args) {
        queries += 1;
        return original.apply(this, args);
    };
    try {
        const result = await work();
        return { result, queries };
    } finally {
        sequelize.query = original;
    }
};

test('several items come back keyed by id, each in the same shape as GET /api/item/:id', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedItems(sequelize);

    const result = await batch('707,708,999');

    assert.strictEqual(result.code, 200);
    assert.deepStrictEqual(Object.keys(result.payload.data).sort(), ['707', '708']);
    for (const id of [707, 708]) {
        const one = await single(id);
        assert.deepStrictEqual(result.payload.data[id], one.payload.data, `item ${id}`);
    }
    assert.deepStrictEqual(result.payload.data[707].pricesInCredits, { default: 120, painted: 150 });
    assert.strictEqual(result.payload.data[708].pricesInCredits, null);
});

test('repeated ids are answered once and unknown ids are simply absent', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedItems(sequelize);

    const repeated = await batch('707,707,707');
    assert.strictEqual(repeated.code, 200);
    assert.deepStrictEqual(Object.keys(repeated.payload.data), ['707']);

    const unknown = await batch('5,6');
    assert.strictEqual(unknown.code, 200);
    assert.deepStrictEqual(unknown.payload.data, {});
});

test('a malformed id list is refused with 422', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedItems(sequelize);

    for (const ids of [undefined, '', ',', '707,', '707,,708', 'abc', '707,x', '-1', '0', '1.5', ' 707', '0707', '12345678901', ['707', '708']]) {
        const result = await batch(ids);
        assert.strictEqual(result.code, 422, `ids ${JSON.stringify(ids)}: ${JSON.stringify(result.payload)}`);
    }
});

test('at most 200 distinct ids are served in one request', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedItems(sequelize, 201);

    const ids = Array.from({ length: 200 }, (_, i) => 1000 + i);
    const full = await batch([...ids, ...ids.slice(0, 50)].join(','));
    assert.strictEqual(full.code, 200);
    assert.strictEqual(Object.keys(full.payload.data).length, 200);

    const tooMany = await batch([...ids, 1200].join(','));
    assert.strictEqual(tooMany.code, 422);
});

test('the number of database queries does not grow with the number of items', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedItems(sequelize, 200);

    const few = await countQueries(sequelize, () => batch('1000,1001'));
    const many = await countQueries(
        sequelize, () => batch(Array.from({ length: 200 }, (_, i) => 1000 + i).join(',')),
    );

    assert.strictEqual(few.result.code, 200);
    assert.strictEqual(many.result.code, 200);
    assert.strictEqual(Object.keys(many.result.payload.data).length, 200);
    assert.strictEqual(many.result.payload.data[1199].pricesInCredits.default, 200);
    assert.ok(few.queries > 0, 'the queries are counted');
    assert.ok(many.queries <= 2, `${many.queries} queries for 200 items`);
    assert.strictEqual(many.queries, few.queries);
});

test('the batch route is mounted next to the single-item route', () => {
    const mounted = [];
    require('../src/routes/item')({ get: (path, ...handlers) => mounted.push({ path, handlers }) });

    const route = mounted.find((r) => r.path === '/api/items');
    assert.ok(route, 'GET /api/items is mounted');
    const ItemController = require('../src/controllers/item');
    assert.strictEqual(route.handlers[route.handlers.length - 1], ItemController.getItemsByIds);
    assert.ok(mounted.some((r) => r.path === '/api/item/:id'));
});

test('every item answer carries the item grade, null where it is not known', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedItems(sequelize);
    await sequelize.query("UPDATE items SET grade = 'classified' WHERE itemId = 707");

    const result = await batch('707,708');

    assert.strictEqual(result.payload.data[707].item_grade, 'classified');
    assert.strictEqual(result.payload.data[708].item_grade, null);
    assert.strictEqual((await single(707)).payload.data.item_grade, 'classified');
});
