const { resetTestDatabase, assertSafeTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const sequelize = require('../src/config/db');
const Storage = require('../src/models/storage');
const Upgrade = require('../src/models/upgrade');
const ItemService = require('../src/services/item');
const PFService = require('../src/services/provablyFair');
const { upgradeRoll } = require('../src/modules/upgradeFair');
const { signToken } = require('../src/auth/token');
const MESSAGE = require('../src/constant/responseMessages');

let itemHash;
const emitted = [];
const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true,
    exports: {
        getAllDataHashWithKey: async () => {
            assert.ok(itemHash, 'An upgrade must not read Redis');
            return itemHash;
        },
    },
};
const chatPath = require.resolve('../src/socket/chat');
require.cache[chatPath] = {
    id: chatPath, filename: chatPath, loaded: true,
    exports: { getIo: () => ({ emit: (...args) => emitted.push(args) }) },
};

const { buildApp } = require('../app');
const limiters = require('../src/middleware/rateLimiters');
const CLIENT_SEED = 'upgrade-client';
const NONCE = 7;
const BODY = { storageIds: [2, 1], targetItemId: 30, targetColor: 'default', expectedThreshold: 450000 };
const hash = (seed) => createHash('sha256').update(seed).digest('hex');
const seedFor = (won) => {
    for (let i = 0; ; i += 1) {
        const seed = `upgrade-server-${i}`;
        if ((upgradeRoll(seed, CLIENT_SEED, NONCE) < BODY.expectedThreshold) === won) { return seed; }
    }
};
const WIN_SEED = seedFor(true);
const LOSS_SEED = seedFor(false);
let server;
let baseUrl;

test.before(async () => {
    assertSafeTestDatabase();
    server = await new Promise((resolve) => {
        const listening = buildApp().listen(0, '127.0.0.1', () => resolve(listening));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    if (server) { await new Promise((resolve) => server.close(resolve)); }
    await sequelize.close();
});

test.beforeEach(async () => {
    await resetTestDatabase();
    itemHash = null;
    emitted.length = 0;
    for (const id of [1, 2, 3]) { limiters.upgradeLimiter?.resetKey(String(id)); }
    const qi = sequelize.getQueryInterface();
    await qi.bulkInsert('users', [1, 2, 3].map((id) => ({
        id, login: `player${id}`, email: `player${id}@e.ua`, password: 'x', balance: '1000.00', rank: 0, role: id === 3 ? -1 : 1,
    })));
    await qi.bulkInsert('items', [10, 20, 30, 40].map((itemId) => ({
        itemId, name: `Item ${itemId}`, colors: '["default","painted"]', imagePath: `/img/${itemId}.webp`,
    })));
    await qi.bulkInsert('insider_prices', [
        { name: 'Item 10', pricesInCredits: JSON.stringify(JSON.stringify({ default: '12.50', painted: '7.50' })) },
        { name: 'Item 20', pricesInCredits: JSON.stringify({ default: 0.1, painted: 0.2 }) },
        { name: 'Item 30', pricesInCredits: JSON.stringify({ default: '40.00', painted: '45.01' }) },
    ]);
    await qi.bulkInsert('storage', Array.from({ length: 11 }, (_, i) => ({
        id: i + 1, userId: i === 6 ? 2 : 1, itemId: i === 2 || i === 3 ? 20 : 10,
        color: i === 1 || i === 3 ? 'painted' : 'default', caseId: 'dust2',
        status: ['money', 'received', 'waitingtrade', 'upgraded'][i - 7] || 'inventory',
        created_at: new Date('2026-01-01T00:00:00Z'),
    })));
    await qi.bulkInsert('provably_fair_seeds', [{
        id: 1, userId: 1, serverSeed: WIN_SEED, serverSeedHash: hash(WIN_SEED), clientSeed: CLIENT_SEED,
        nonce: NONCE, status: 'active', created_at: new Date('2026-01-01T00:00:00Z'),
    }]);
});

const request = async (body = BODY, userId = 1, path = '/api/upgrade', method = 'POST') => {
    const headers = { 'Content-Type': 'application/json' };
    if (userId !== null) { headers.Authorization = `Bearer ${signToken({ user_id: userId })}`; }
    const response = await fetch(`${baseUrl}${path}`, { method, headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const content = await response.text();
    let payload;
    try { payload = JSON.parse(content); } catch { payload = content; }
    return { status: response.status, payload, headers: response.headers };
};

const snapshot = async () => {
    const tables = ['users', 'storage', 'provably_fair_seeds', 'upgrades', 'balance_history'];
    return Object.fromEntries(await Promise.all(tables.map(async (table) => [
        table, (await sequelize.query(`SELECT * FROM ${table} ORDER BY id`))[0],
    ])));
};

const catchLogs = (t) => {
    const logs = [];
    for (const method of ['log', 'info', 'debug', 'warn', 'error', 'trace', 'dir', 'table']) {
        t.mock.method(console, method, (...args) => logs.push({ method, args }));
    }
    return logs;
};

const refused = async (body, code, status = 422, userId = 1) => {
    const before = await snapshot();
    const result = await request(body, userId);
    assert.equal(result.status, status, JSON.stringify(result.payload));
    assert.equal(result.payload.code, code);
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual(emitted, []);
    return result.payload;
};

test('a known win consumes the stakes, stores the complete audit and returns exact amounts without logs', async (t) => {
    const logs = catchLogs(t);
    const before = await snapshot();
    const { status, payload } = await request();
    assert.equal(status, 200, JSON.stringify(payload));
    assert.deepEqual(payload, {
        status: 200,
        data: {
            upgradeId: 1, won: true, roll: upgradeRoll(WIN_SEED, CLIENT_SEED, NONCE), threshold: 450000,
            stakeValue: '20.00', targetPrice: '40.00', nonce: NONCE, serverSeedHash: hash(WIN_SEED), clientSeed: CLIENT_SEED,
            item: { storage_id: 12, storage_itemId: 30, storage_color: 'default' },
        },
    });
    const after = await snapshot();
    assert.deepEqual(after.users, before.users);
    assert.deepEqual(after.balance_history, []);
    assert.equal(after.storage.length, before.storage.length + 1);
    for (const row of after.storage.slice(0, 2)) {
        assert.equal(row.status, 'upgraded');
        assert.ok(row.updated_at instanceof Date);
    }
    assert.deepEqual(after.storage.slice(2, 11), before.storage.slice(2));
    const result = after.storage.at(-1);
    assert.deepEqual([result.userId, result.itemId, result.color, result.caseId, result.status], [1, 30, 'default', null, 'inventory']);
    assert.ok(result.created_at instanceof Date);
    assert.equal(after.provably_fair_seeds[0].nonce, NONCE + 1);
    assert.equal(after.upgrades.length, 1);
    const { created_at, stake, ...audit } = after.upgrades[0];
    assert.deepEqual(audit, {
        id: 1, userId: 1, seedId: 1, serverSeedHash: hash(WIN_SEED), clientSeed: CLIENT_SEED, nonce: NONCE,
        stakeValue: '20.00', targetItemId: 30, targetColor: 'default', targetPrice: '40.00',
        threshold: 450000, roll: payload.data.roll, won: 1, resultStorageId: 12,
    });
    assert.deepEqual(JSON.parse(stake), [
        { storageId: 1, itemId: 10, color: 'default', price: '12.50' },
        { storageId: 2, itemId: 10, color: 'painted', price: '7.50' },
    ]);
    assert.ok(created_at instanceof Date);
    assert.deepEqual(logs, []);
    assert.deepEqual(emitted, [['new-drop', {
        user_login: 'player1', storage_id: 12, storage_itemId: 30, storage_userId: 1,
        storage_caseId: null, storage_color: 'default', source: 'upgrade',
    }]]);
});

test('an upgrade preserves a legacy active client seed of 200 code points', async (t) => {
    const clientSeed = `😀${'\uFE0E\uFE0F'.repeat(99)}z`;
    assert.equal(Array.from(clientSeed).length, 200);
    await sequelize.query('UPDATE provably_fair_seeds SET clientSeed = ? WHERE id = 1', { replacements: [clientSeed] });
    const logs = catchLogs(t);
    const { status, payload } = await request();
    assert.equal(status, 200, JSON.stringify(payload));
    assert.equal(payload.data.clientSeed, clientSeed);
    assert.equal(payload.data.roll, upgradeRoll(WIN_SEED, clientSeed, NONCE));
    const after = await snapshot();
    assert.equal(after.upgrades.length, 1);
    assert.equal(after.upgrades[0].clientSeed, clientSeed);
    assert.equal(after.upgrades[0].nonce, NONCE);
    assert.equal(after.provably_fair_seeds[0].clientSeed, clientSeed);
    assert.equal(after.provably_fair_seeds[0].nonce, NONCE + 1);
    assert.deepEqual(after.storage.slice(0, 2).map((row) => row.status), ['upgraded', 'upgraded']);
    assert.deepEqual(logs, []);
});

test('a known loss consumes the stakes and one nonce but creates no item or balance change', async (t) => {
    await sequelize.query('UPDATE provably_fair_seeds SET serverSeed = ?, serverSeedHash = ? WHERE id = 1', {
        replacements: [LOSS_SEED, hash(LOSS_SEED)],
    });
    const logs = catchLogs(t);
    const before = await snapshot();
    const { status, payload } = await request();
    assert.equal(status, 200, JSON.stringify(payload));
    assert.deepEqual([payload.data.won, payload.data.roll, payload.data.item], [false, upgradeRoll(LOSS_SEED, CLIENT_SEED, NONCE), null]);
    const after = await snapshot();
    assert.deepEqual(after.users, before.users);
    assert.deepEqual(after.balance_history, []);
    assert.equal(after.storage.length, before.storage.length);
    assert.deepEqual(after.storage.slice(0, 2).map((row) => row.status), ['upgraded', 'upgraded']);
    assert.deepEqual(after.storage.slice(2), before.storage.slice(2));
    assert.equal(after.provably_fair_seeds[0].nonce, NONCE + 1);
    assert.equal(after.upgrades.length, 1);
    assert.deepEqual([after.upgrades[0].won, after.upgrades[0].resultStorageId], [0, null]);
    assert.deepEqual(logs, []);
    assert.deepEqual(emitted, []);
});

test('seed preparation precedes the transaction and locked stakes precede every database price read', async (t) => {
    const originalQuery = sequelize.query;
    const queries = [];
    t.mock.method(sequelize, 'query', function traced(sql, options) {
        queries.push({ sql: typeof sql === 'string' ? sql : sql.query, transaction: options?.transaction });
        return originalQuery.call(this, sql, options);
    });
    const originalPrices = ItemService.getItemsWithPrices;
    const prices = t.mock.method(ItemService, 'getItemsWithPrices', function traced(...args) {
        return originalPrices.apply(this, args);
    });
    const { status, payload } = await request();
    assert.equal(status, 200, JSON.stringify(payload));
    assert.equal(prices.mock.callCount(), 1);
    const transaction = prices.mock.calls[0].arguments[1]?.transaction;
    assert.ok(transaction);
    assert.equal(transaction.finished, 'commit');
    const start = queries.findIndex(({ sql }) => /START TRANSACTION/i.test(sql));
    assert.ok(queries.slice(0, start).some(({ sql, transaction: tx }) => /FROM `provably_fair_seeds`/i.test(sql) && !tx));
    const locked = queries.filter(({ sql }) => /FOR UPDATE/.test(sql));
    assert.equal(locked.length, 3);
    for (const [index, table] of ['users', 'provably_fair_seeds', 'storage'].entries()) {
        assert.match(locked[index].sql, new RegExp(`FROM \`${table}\``));
        assert.equal(locked[index].transaction, transaction);
    }
    assert.match(locked[2].sql, /ORDER BY .*`(?:storage_)?id` ASC FOR UPDATE/);
    assert.match(locked[2].sql, /`userId` = 1/);
    const priced = queries.filter(({ sql }) => /FROM `?items`?\s/i.test(sql));
    assert.equal(priced.length, 2);
    for (const query of priced) {
        assert.equal(query.transaction, transaction);
        assert.ok(queries.indexOf(query) > queries.indexOf(locked[2]));
    }
    const writes = queries.filter(({ sql }) => /^(UPDATE|INSERT INTO) /i.test(sql));
    assert.equal(writes.length, 4);
    for (const [index, table] of ['storage', 'storage', 'upgrades', 'provably_fair_seeds'].entries()) {
        assert.match(writes[index].sql, new RegExp(`^(?:UPDATE|INSERT INTO) \`${table}\``));
        assert.equal(writes[index].transaction, transaction);
    }
});

test('a changed expected threshold returns 409 with current threshold and prices and rolls back quietly', async (t) => {
    const logs = catchLogs(t);
    const payload = await refused({ ...BODY, expectedThreshold: 450001 }, 'UPGRADE.CHANCE_CHANGED', 409);
    assert.deepEqual(payload, {
        status: 409, message: MESSAGE.UPGRADE.CHANCE_CHANGED, code: 'UPGRADE.CHANCE_CHANGED',
        threshold: 450000, stakeValue: '20.00', targetPrice: '40.00',
    });
    assert.deepEqual(logs, []);
});

test('prices changed before the storage lock completes are checked inside the transaction', async (t) => {
    const original = Storage.findAll;
    t.mock.method(Storage, 'findAll', async function locked(options) {
        const rows = await original.call(this, options);
        if (options.lock) {
            await sequelize.query('UPDATE insider_prices SET pricesInCredits = ? WHERE name = ?', {
                replacements: ['{"default":"160.04"}', 'Item 30'],
            });
            await sequelize.query('UPDATE insider_prices SET pricesInCredits = ? WHERE name = ?', {
                replacements: ['{"default":"25.01","painted":"15.00"}', 'Item 10'],
            });
        }
        return rows;
    });
    const logs = catchLogs(t);
    const payload = await refused(BODY, 'UPGRADE.CHANCE_CHANGED', 409);
    assert.equal(payload.threshold, 225000);
    assert.equal(payload.stakeValue, '40.01');
    assert.equal(payload.targetPrice, '160.04');
    assert.deepEqual(logs, []);
});

test('foreign, missing and unavailable stakes are refused together with any otherwise valid stakes', async (t) => {
    const logs = catchLogs(t);
    for (const storageId of [7, 8, 9, 10, 11, 999]) {
        await refused({ ...BODY, storageIds: [1, storageId] }, 'UPGRADE.ITEM_NOT_AVAILABLE');
    }
    assert.deepEqual(logs, []);
});

test('a stake with a missing item or missing colour price is unavailable', async (t) => {
    const logs = catchLogs(t);
    for (const itemId of [40, 999]) {
        await sequelize.query('UPDATE storage SET itemId = ? WHERE id = 1', { replacements: [itemId] });
        await refused(BODY, 'UPGRADE.ITEM_NOT_AVAILABLE');
    }
    await sequelize.query("UPDATE storage SET itemId = 10, color = 'gold' WHERE id = 1");
    await refused(BODY, 'UPGRADE.ITEM_NOT_AVAILABLE');
    assert.deepEqual(logs, []);
});

test('missing targets and missing, zero, negative or malformed target prices are refused quietly', async (t) => {
    const logs = catchLogs(t);
    for (const targetItemId of [40, 999]) {
        await refused({ ...BODY, targetItemId }, 'UPGRADE.TARGET_NOT_FOUND');
    }
    for (const prices of [{ default: 40 }, { painted: 0 }, { painted: -1 }, { painted: true }, { painted: 'bad' }, 'invalid JSON']) {
        await sequelize.query('UPDATE insider_prices SET pricesInCredits = ? WHERE name = ?', {
            replacements: [JSON.stringify(prices), 'Item 30'],
        });
        await refused({ ...BODY, targetColor: 'painted' }, 'UPGRADE.TARGET_NOT_FOUND');
    }
    assert.deepEqual(logs, []);
});

for (const [price, code] of [['23.99', 'UPGRADE.CHANCE_TOO_HIGH'], ['1800.01', 'UPGRADE.CHANCE_TOO_LOW']]) {
    test(`a target priced at ${price} is outside the allowed chance bounds`, async (t) => {
        await sequelize.query('UPDATE insider_prices SET pricesInCredits = ? WHERE name = ?', {
            replacements: [JSON.stringify({ default: price }), 'Item 30'],
        });
        const logs = catchLogs(t);
        await refused(BODY, code);
        assert.deepEqual(logs, []);
    });
}

for (const [price, threshold] of [['24.00', 750000], ['1800.00', 10000]]) {
    test(`the allowed threshold boundary ${threshold} succeeds`, async () => {
        await sequelize.query('UPDATE insider_prices SET pricesInCredits = ? WHERE name = ?', {
            replacements: [JSON.stringify({ default: price }), 'Item 30'],
        });
        const { status, payload } = await request({ ...BODY, expectedThreshold: threshold });
        assert.equal(status, 200, JSON.stringify(payload));
        assert.equal(payload.data.threshold, threshold);
        assert.equal(payload.data.targetPrice, price);
    });
}

test('fractional stakes are summed in kopiyky and a painted target has its own price', async () => {
    await sequelize.query('UPDATE insider_prices SET pricesInCredits = ? WHERE name = ?', {
        replacements: ['{"default":"40.00","painted":"0.60"}', 'Item 30'],
    });
    await sequelize.query("UPDATE modules SET extraData = '0.7' WHERE param = 'uah-credit-rate'");
    const { status, payload } = await request({ ...BODY, storageIds: [4, 3], targetColor: 'painted' });
    assert.equal(status, 200, JSON.stringify(payload));
    assert.equal(payload.data.stakeValue, '0.30');
    assert.equal(payload.data.targetPrice, '0.60');
    assert.equal(payload.data.item.storage_color, 'painted');
    const [rows] = await sequelize.query('SELECT stake, stakeValue, targetPrice FROM upgrades');
    assert.deepEqual(JSON.parse(rows[0].stake).map(({ price }) => price), ['0.10', '0.20']);
    assert.equal(rows[0].stakeValue, '0.30');
    assert.equal(rows[0].targetPrice, '0.60');
});

test('six distinct stakes are accepted and consume exactly one nonce', async () => {
    await sequelize.query('UPDATE insider_prices SET pricesInCredits = ? WHERE name = ?', {
        replacements: ['{"default":"90.60"}', 'Item 30'],
    });
    const { status, payload } = await request({ ...BODY, storageIds: [6, 3, 1, 5, 4, 2] });
    assert.equal(status, 200, JSON.stringify(payload));
    assert.equal(payload.data.stakeValue, '45.30');
    const after = await snapshot();
    assert.ok(after.storage.slice(0, 6).every(({ status: value }) => value === 'upgraded'));
    assert.equal(after.provably_fair_seeds[0].nonce, NONCE + 1);
    assert.equal(after.upgrades.length, 1);
});

test('malformed bodies are refused before seed preparation without logging', async (t) => {
    const prepared = t.mock.method(PFService, 'ensureActiveSeed', async () => { throw new Error('Invalid input must not prepare a seed'); });
    const logs = catchLogs(t);
    const invalid = [
        {}, ...['storageIds', 'targetItemId', 'targetColor', 'expectedThreshold'].map((field) => ({ ...BODY, [field]: undefined })),
        ...[[], [1, 2, 3, 4, 5, 6, 7], [1, 1], [1.5], [0], [-1], [2147483648], ['1'], [[1]], [true], [null], 1, '1', {}]
            .map((storageIds) => ({ ...BODY, storageIds })),
        ...[[30], [30, 40], 1.5, 0, 2147483648, {}, true, null].map((targetItemId) => ({ ...BODY, targetItemId })),
        ...['gold', ['default'], {}, null].map((targetColor) => ({ ...BODY, targetColor })),
        ...[null, [450000], {}, -1, 1000001, 0.5, true].map((expectedThreshold) => ({ ...BODY, expectedThreshold })),
    ];
    for (const body of invalid) {
        limiters.upgradeLimiter?.resetKey('1');
        await refused(body, 'VALIDATOR.ERROR');
    }
    assert.equal(prepared.mock.callCount(), 0);
    assert.deepEqual(logs, []);
});

test('guest and banned players cannot upgrade or prepare a seed', async (t) => {
    const prepared = t.mock.method(PFService, 'ensureActiveSeed', async () => { throw new Error('Forbidden requests must not prepare a seed'); });
    const logs = catchLogs(t);
    await refused(BODY, 'AUTH.NOT_AUTHORIZED', 401, null);
    await refused(BODY, 'ADMIN.BANNED', 403, 3);
    assert.equal(prepared.mock.callCount(), 0);
    assert.deepEqual(logs, []);
});

test('the route allows 30 attempts per minute per player and keeps refusals quiet', async (t) => {
    const logs = catchLogs(t);
    for (let i = 0; i < 30; i += 1) {
        const { status, payload } = await request({});
        assert.equal(status, 422, JSON.stringify(payload));
    }
    const blocked = await request({});
    assert.equal(blocked.status, 429);
    assert.equal(blocked.payload.code, 'LIMIT.UPGRADE');
    assert.equal(blocked.headers.get('ratelimit-limit'), '30');
    assert.equal(blocked.headers.get('ratelimit-policy'), '30;w=60');
    assert.equal((await request({}, 2)).status, 422);
    assert.deepEqual(logs, []);
});

test('two concurrent upgrades can consume the same stakes only once', async (t) => {
    const logs = catchLogs(t);
    const results = await Promise.all([request(), request({ ...BODY, storageIds: [1, 2] })]);
    assert.deepEqual(results.map(({ status }) => status).sort(), [200, 422], JSON.stringify(results));
    assert.equal(results.find(({ status }) => status === 422).payload.code, 'UPGRADE.ITEM_NOT_AVAILABLE');
    const after = await snapshot();
    assert.equal(after.upgrades.length, 1);
    assert.equal(after.storage.length, 12);
    assert.equal(after.provably_fair_seeds[0].nonce, NONCE + 1);
    assert.deepEqual(after.users.map(({ balance }) => balance), ['1000.00', '1000.00', '1000.00']);
    assert.deepEqual(logs, []);
});

test('an upgrade racing a sale consumes the shared item exactly once', async (t) => {
    await sequelize.query("UPDATE modules SET extraData = '1' WHERE param = 'uah-credit-rate'");
    const logs = catchLogs(t);
    const [upgrade, sale] = await Promise.all([
        request({ ...BODY, storageIds: [1], expectedThreshold: 281250 }),
        request({}, 1, '/api/storage/sell/1', 'PUT'),
    ]);
    assert.deepEqual([upgrade.status, sale.status].sort(), [200, 422], JSON.stringify([upgrade, sale]));
    const after = await snapshot();
    if (upgrade.status === 200) {
        assert.equal(sale.payload.code, 'ITEM.NOT_IN_INVENTORY');
        assert.equal(after.storage[0].status, 'upgraded');
        assert.equal(after.upgrades.length, 1);
        assert.equal(after.users[0].balance, '1000.00');
        assert.equal(after.balance_history.length, 0);
        assert.equal(after.provably_fair_seeds[0].nonce, NONCE + 1);
    } else {
        assert.equal(upgrade.payload.code, 'UPGRADE.ITEM_NOT_AVAILABLE');
        assert.equal(after.storage[0].status, 'money');
        assert.equal(after.upgrades.length, 0);
        assert.equal(after.users[0].balance, '1012.50');
        assert.equal(after.balance_history.length, 1);
        assert.equal(after.provably_fair_seeds[0].nonce, NONCE);
    }
    assert.deepEqual(logs, []);
});

test('a concurrent case open and upgrade use consecutive nonces from the same seed', async (t) => {
    const allCases = require('../src/constant/cases/_all');
    itemHash = Object.fromEntries(allCases.dust2.ITEMS.map((item) => [item.id, JSON.stringify({
        name: `Case item ${item.id}`, type: 'rifles', rare: item.rare, item_imagePath: `/img/${item.id}.webp`,
        pricesInCredits: JSON.stringify({ default: 10, painted: 20 }),
    })]));
    await sequelize.query("INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) "
        + "VALUES ('dust2', 'DUST2', 100, 0, 1, 1, 0, 'weapon', -1)");
    catchLogs(t);
    const results = await Promise.all([request(), request({ id: 'dust2', count: 1 }, 1, '/api/case/open')]);
    assert.deepEqual(results.map(({ status }) => status), [200, 200], JSON.stringify(results));
    const [opens] = await sequelize.query('SELECT nonce, seedId FROM case_opens');
    const after = await snapshot();
    assert.equal(opens.length, 1);
    assert.equal(after.upgrades.length, 1);
    assert.deepEqual([opens[0].nonce, after.upgrades[0].nonce].sort((a, b) => a - b), [NONCE, NONCE + 1]);
    assert.deepEqual([opens[0].seedId, after.upgrades[0].seedId], [1, 1]);
    assert.equal(after.provably_fair_seeds[0].nonce, NONCE + 2);
    assert.equal(after.users[0].balance, '900.00');
    assert.equal(results[0].payload.data.roll, upgradeRoll(WIN_SEED, CLIENT_SEED, after.upgrades[0].nonce));
    assert.equal(emitted.filter(([, drop]) => drop.source === 'case').length, 1);
    assert.equal(emitted.filter(([, drop]) => drop.source === 'upgrade').length, Number(results[0].payload.data.won));
});

test('a player without an active seed gets one and uses nonce zero', async () => {
    await sequelize.query('DELETE FROM provably_fair_seeds');
    const { status, payload } = await request();
    assert.equal(status, 200, JSON.stringify(payload));
    const after = await snapshot();
    assert.equal(after.provably_fair_seeds.length, 1);
    const seed = after.provably_fair_seeds[0];
    assert.equal(seed.nonce, 1);
    assert.equal(payload.data.nonce, 0);
    assert.equal(payload.data.serverSeedHash, hash(seed.serverSeed));
    assert.equal(payload.data.roll, upgradeRoll(seed.serverSeed, seed.clientSeed, 0));
});

for (const step of ['prices', 'audit', 'nonce']) {
    test(`an unexpected failure at ${step} rolls back everything and is logged only through answerFailure`, async (t) => {
        const [object, method] = { prices: [ItemService, 'getItemsWithPrices'], audit: [Upgrade, 'create'], nonce: [PFService, 'bumpNonce'] }[step];
        t.mock.method(object, method, async () => { throw new Error(`Unexpected ${step} failure`); });
        const logs = catchLogs(t);
        const payload = await refused(BODY, 'SERVER.ERROR', 500);
        assert.equal(payload.message, MESSAGE.SERVER.ERROR);
        assert.equal(logs.length, 1);
        assert.equal(logs[0].method, 'error');
        assert.match(logs[0].args[0], /^\[upgrade[^\]]*\] unexpected error:$/);
        assert.match(logs[0].args[1], new RegExp(`Unexpected ${step} failure`));
        assert.ok(!JSON.stringify(payload).includes(`Unexpected ${step} failure`));
    });
}
