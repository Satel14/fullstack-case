const { resetTestDatabase, assertSafeTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const sequelize = require('../src/config/db');
const ItemService = require('../src/services/item');
const MESSAGE = require('../src/constant/responseMessages');

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true,
    exports: { getAllDataHashWithKey: async () => { throw new Error('The targets catalogue must not read Redis'); } },
};

const { buildApp } = require('../app');
const ITEMS = [
    { itemId: 30, name: 'AWP | Fade', grade: 'covert', prices: { default: '12.50', painted: '1350.27' } },
    { itemId: 10, name: 'AK-47 | Redline', grade: 'classified', prices: { painted: 12.5, default: 12.5 }, encoded: true },
    { itemId: 20, name: 'P250 | Sand Dune', grade: null, prices: { default: 12.5, painted: 0 } },
    { itemId: 40, name: 'Knife | Night', grade: 'special', prices: { default: 0, painted: 1350.28 } },
    { itemId: 50, name: 'Penny | Exact', grade: 'restricted', prices: { default: 0.29, painted: 0.3 } },
    { itemId: 60, name: 'Without prices', grade: null },
    { itemId: 70, name: 'Nonpositive prices', grade: null, prices: { default: -1, painted: 0 } },
    { itemId: 80, name: 'Painted only', grade: 'covert', prices: { default: null, painted: 10 } },
    { itemId: 90, name: 'Other colours', grade: null, prices: { red: 8, blue: 7 } },
];
const TARGETS = [
    [50, 'default', 0.29], [50, 'painted', 0.3], [80, 'painted', 10],
    [10, 'default', 12.5], [10, 'painted', 12.5], [20, 'default', 12.5], [30, 'default', 12.5],
    [30, 'painted', 1350.27], [40, 'painted', 1350.28],
].map(([itemId, color, price]) => {
    const { name, grade } = ITEMS.find((item) => item.itemId === itemId);
    return { itemId, color, name, grade, imagePath: `/img/items/${itemId}.webp`, price };
});

let server;
let url;

test.before(async () => {
    assertSafeTestDatabase();
    server = await new Promise((resolve) => {
        const listening = buildApp().listen(0, '127.0.0.1', () => resolve(listening));
    });
    url = `http://127.0.0.1:${server.address().port}/api/upgrade/targets`;
});

test.after(async () => {
    if (server) { await new Promise((resolve) => server.close(resolve)); }
    await sequelize.close();
});

test.beforeEach(async () => {
    await resetTestDatabase();
    const qi = sequelize.getQueryInterface();
    await qi.bulkInsert('items', ITEMS.map(({ itemId, name, grade }) => ({
        itemId, name, grade, imagePath: `/img/items/${itemId}.webp`, colors: '["default","painted"]',
    })));
    await qi.bulkInsert('insider_prices', ITEMS.filter(({ prices }) => prices).map(({ name, prices, encoded }) => ({
        name, pricesInCredits: JSON.stringify(encoded ? JSON.stringify(prices) : prices),
    })));
});

const request = async (query = {}, status = 200) => {
    const suffix = typeof query === 'string' ? query : new URLSearchParams(query).toString();
    const response = await fetch(`${url}?${suffix}`);
    assert.equal(response.status, status, suffix);
    return response.json();
};

const tracedQueries = (t) => {
    const original = sequelize.query;
    return t.mock.method(sequelize, 'query', function traced(...args) { return original.apply(this, args); });
};

const catchLogs = (t) => {
    const logs = [];
    for (const method of ['log', 'info', 'debug', 'warn', 'error', 'trace', 'dir', 'table']) {
        t.mock.method(console, method, (...args) => logs.push({ method, args }));
    }
    return logs;
};

test('getAllItemsWithPrices uses one database join and decodes both stored JSON price formats', async (t) => {
    const query = tracedQueries(t);
    const rows = await ItemService.getAllItemsWithPrices();
    assert.equal(query.mock.callCount(), 1);
    assert.match(query.mock.calls[0].arguments[0], /JOIN\s+insider_prices/i);
    assert.equal(rows.length, ITEMS.length);
    assert.deepEqual(rows.find(({ item_itemId }) => item_itemId === 10).pricesInCredits, { painted: 12.5, default: 12.5 });
    assert.deepEqual(rows.find(({ item_itemId }) => item_itemId === 30).pricesInCredits, { default: '12.50', painted: '1350.27' });
    assert.equal(rows.find(({ item_itemId }) => item_itemId === 60).pricesInCredits, null);
});

test('the public route returns only positive default/painted targets in price, item and colour order', async (t) => {
    const query = tracedQueries(t);
    const logs = catchLogs(t);
    assert.deepEqual(await request(), { status: 200, data: { items: TARGETS, total: 9 } });
    assert.equal(query.mock.callCount(), 1);
    assert.deepEqual(logs, []);
});

test('decimal price bounds are inclusive and compared in kopiyky', async () => {
    const { data } = await request({ minPrice: '12.5', maxPrice: '1350.27' });
    assert.deepEqual(data, { items: TARGETS.slice(3, 8), total: 5 });
    assert.deepEqual((await request({ minPrice: '0.29', maxPrice: '0.29' })).data, { items: [TARGETS[0]], total: 1 });
    assert.deepEqual((await request({ minPrice: '1350.27', maxPrice: '1350.27' })).data, { items: [TARGETS[7]], total: 1 });
});

test('individual price bounds, zero bounds and empty price intervals work', async () => {
    assert.deepEqual((await request({ minPrice: '1350.28' })).data, { items: [TARGETS[8]], total: 1 });
    assert.deepEqual((await request({ maxPrice: '0.30' })).data, { items: TARGETS.slice(0, 2), total: 2 });
    assert.deepEqual((await request({ minPrice: '0' })).data, { items: TARGETS, total: 9 });
    assert.deepEqual((await request({ maxPrice: '0' })).data, { items: [], total: 0 });
    assert.deepEqual((await request({ minPrice: '20', maxPrice: '10' })).data, { items: [], total: 0 });
});

test('sub-kopiyka bounds do not widen the inclusive price interval', async () => {
    assert.deepEqual((await request({ minPrice: '0.291', maxPrice: '0.3' })).data, { items: [TARGETS[1]], total: 1 });
    assert.deepEqual((await request({ minPrice: '0.29', maxPrice: '0.299' })).data, { items: [TARGETS[0]], total: 1 });
    assert.deepEqual((await request({ minPrice: '0.2900000000000000001', maxPrice: '0.3' })).data, { items: [TARGETS[1]], total: 1 });
});

test('search is a case-insensitive substring and combines with prices before pagination', async () => {
    assert.deepEqual((await request({ search: '  rEdLiNe  ' })).data, { items: TARGETS.slice(3, 5), total: 2 });
    assert.deepEqual((await request({ search: 'FADE', minPrice: '12.50', limit: '1', offset: '1' })).data,
        { items: [TARGETS[7]], total: 2 });
    assert.deepEqual((await request({ search: 'absent' })).data, { items: [], total: 0 });
});

test('an empty or whitespace-only search applies no filter', async () => {
    for (const search of ['', '   ', '\t \n', ' '.repeat(100)]) {
        assert.deepEqual((await request({ search })).data, { items: TARGETS, total: 9 });
    }
});

test('search treats SQL wildcard characters as literal text', async () => {
    for (const search of ['%', '_', "' OR 1=1 --"]) {
        assert.deepEqual((await request({ search })).data, { items: [], total: 0 });
    }
});

test('search accepts 64 Unicode code points and rejects 65 or variation-selector padding', async () => {
    assert.equal((await request({ search: '😀'.repeat(64) })).data.total, 0);
    assert.equal((await request({ search: '😀'.repeat(65) }, 422)).code, 'VALIDATOR.ERROR');
    assert.equal((await request({ search: `a${'\uFE0F'.repeat(64)}` }, 422)).code, 'VALIDATOR.ERROR');
});

test('limit and offset page the filtered colours and total stays unpaged', async () => {
    assert.deepEqual((await request({ limit: '2', offset: '3' })).data, { items: TARGETS.slice(3, 5), total: 9 });
    assert.deepEqual((await request({ limit: '100', offset: '8' })).data, { items: [TARGETS[8]], total: 9 });
    for (const offset of ['9', '2147483647']) {
        assert.deepEqual((await request({ offset })).data, { items: [], total: 9 });
    }
});

test('the default limit is 60 and the maximum limit is 100', async () => {
    const qi = sequelize.getQueryInterface();
    const extra = Array.from({ length: 110 }, (_, i) => ({ itemId: 1000 + i, name: `Extra ${i}` }));
    await qi.bulkInsert('items', extra);
    await qi.bulkInsert('insider_prices', extra.map(({ name }) => ({ name, pricesInCredits: '{"default":1}' })));
    const first = (await request()).data;
    assert.equal(first.total, 119);
    assert.equal(first.items.length, 60);
    const maximum = (await request({ limit: '100' })).data;
    assert.equal(maximum.total, 119);
    assert.equal(maximum.items.length, 100);
    const remaining = (await request({ limit: '100', offset: '100' })).data;
    assert.equal(remaining.total, 119);
    assert.equal(remaining.items.length, 19);
});

test('an empty catalogue returns an empty page and zero total', async () => {
    await sequelize.query('DELETE FROM items');
    assert.deepEqual(await request(), { status: 200, data: { items: [], total: 0 } });
});

test('each request reads current database prices and metadata without Redis', async () => {
    assert.equal((await request({ search: 'Fade' })).data.items[0].price, 12.5);
    await sequelize.query('UPDATE insider_prices SET pricesInCredits = ? WHERE name = ?', {
        replacements: ['{"default":99.99,"painted":0}', 'AWP | Fade'],
    });
    await sequelize.query("UPDATE items SET imagePath = '/database-updated.webp' WHERE itemId = 30");
    assert.deepEqual((await request({ search: 'Fade' })).data, {
        items: [{ ...TARGETS[6], price: 99.99, imagePath: '/database-updated.webp' }], total: 1,
    });
});

test('missing, malformed and unusable prices do not create targets', async () => {
    for (const prices of [null, 'broken JSON', [], { default: true, painted: 'bad' }, { default: '0', painted: -10 }]) {
        await sequelize.query('UPDATE insider_prices SET pricesInCredits = ? WHERE name = ?', {
            replacements: [JSON.stringify(prices), 'AK-47 | Redline'],
        });
        assert.deepEqual((await request({ search: 'Redline' })).data, { items: [], total: 0 });
    }
});

test('malformed and list query values answer 422 without SQL or log lines', async (t) => {
    const query = t.mock.method(sequelize, 'query', async () => { throw new Error('Invalid queries must not read the database'); });
    const logs = catchLogs(t);
    const invalid = [
        'limit=a', 'limit=0', 'limit=101', 'limit=1.5', 'limit=', 'offset=-1', 'offset=1.5',
        'offset=2147483648', 'offset=999999999999999999999', 'minPrice=-1', 'maxPrice=-1',
        'minPrice=a', 'maxPrice=Infinity', 'minPrice=NaN', 'minPrice=', 'maxPrice=12,50',
        'minPrice=12.5%0A', 'maxPrice=12.5%0A',
        `search=${'a'.repeat(65)}`,
        ...['limit', 'offset', 'minPrice', 'maxPrice', 'search'].flatMap((field) => [
            `${field}[]=1`, `${field}[a]=1`, `${field}=1&${field}=2`,
        ]),
    ];
    for (const values of invalid) {
        assert.deepEqual(await request(values, 422), { status: 422, message: MESSAGE.VALIDATOR.ERROR, code: 'VALIDATOR.ERROR' });
    }
    assert.equal(query.mock.callCount(), 0);
    assert.deepEqual(logs, []);
});

test('the query rules reject non-string scalar fields and lists before coercion', async () => {
    const { validate } = require('../src/controllers/upgrade');
    for (const field of ['minPrice', 'maxPrice', 'search', 'limit', 'offset']) {
        for (const value of [null, {}, ['1'], ['1', '2'], 1, true]) {
            const req = { query: { [field]: value }, body: {}, params: {} };
            await Promise.all(validate('getTargets').map((rule) => rule.run(req)));
            assert.equal(validationResult(req).isEmpty(), false, `${field}: ${JSON.stringify(value)}`);
        }
    }
});

test('a database outage goes through answerFailure and exposes only the generic server error', async (t) => {
    const error = Object.assign(new Error('database unavailable'), { sql: 'private-query', parameters: ['private-parameter'] });
    t.mock.method(sequelize, 'query', async () => { throw error; });
    const logs = catchLogs(t);
    assert.deepEqual(await request({}, 500), { status: 500, message: MESSAGE.SERVER.ERROR, code: 'SERVER.ERROR' });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].method, 'error');
    assert.match(logs[0].args.join(' '), /\[upgrade.targets\] unexpected error:.*database unavailable/s);
    assert.doesNotMatch(logs[0].args.join(' '), /private-query|private-parameter/);
    assert.ok(logs[0].args.every((arg) => typeof arg === 'string'));
});
