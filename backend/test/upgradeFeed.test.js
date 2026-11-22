const { resetTestDatabase, assertSafeTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const { Server } = require('socket.io');
const { connectClient } = require('./helpers/socketClient');
const sequelize = require('../src/config/db');
const PFService = require('../src/services/provablyFair');
const UpgradeService = require('../src/services/upgrade');
const { upgradeRoll } = require('../src/modules/upgradeFair');
const { sha256 } = require('../src/modules/provablyFair');
const { signToken } = require('../src/auth/token');

let io;
let socketAvailable = true;
let itemHash;
const chatPath = require.resolve('../src/socket/chat');
require.cache[chatPath] = {
    id: chatPath, filename: chatPath, loaded: true, exports: { getIo: () => socketAvailable ? io : null },
};
const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true,
    exports: { getAllDataHashWithKey: async () => {
        assert.ok(itemHash, 'An upgrade must not use Redis');
        return itemHash;
    } },
};
const { buildApp } = require('../app');
const { upgradeLimiter } = require('../src/middleware/rateLimiters');
const CLIENT_SEED = 'upgrade-feed-client';
const NONCE = 3;
const BODY = { storageIds: [1], targetItemId: 20, targetColor: 'painted', expectedThreshold: 450000 };
const seedFor = (won) => {
    for (let i = 0; ; i += 1) {
        const seed = `upgrade-feed-${i}`;
        if ((upgradeRoll(seed, CLIENT_SEED, NONCE) < BODY.expectedThreshold) === won) { return seed; }
    }
};
const WIN_SEED = seedFor(true);
let server;
let url;
let client;

test.before(async () => {
    assertSafeTestDatabase();
    server = buildApp().listen(0, '127.0.0.1');
    io = new Server(server);
    io.on('connection', (socket) => socket.on('flush', (ack) => ack()));
    await new Promise((resolve) => server.once('listening', resolve));
    url = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    if (io) { await new Promise((resolve) => io.close(resolve)); }
    await sequelize.close();
});

test.beforeEach(async () => {
    await resetTestDatabase();
    upgradeLimiter.resetKey('1');
    socketAvailable = true;
    itemHash = null;
    const qi = sequelize.getQueryInterface();
    await qi.bulkInsert('users', [{ id: 1, login: 'winner', email: 'winner@e.ua', password: 'x', balance: '1000.00', role: 1 }]);
    await qi.bulkInsert('items', [10, 20].map((itemId) => ({ itemId, name: `Item ${itemId}`, imagePath: `/img/${itemId}.webp` })));
    await qi.bulkInsert('insider_prices', [
        { name: 'Item 10', pricesInCredits: '{"default":"20.00"}' },
        { name: 'Item 20', pricesInCredits: '{"painted":"40.00"}' },
    ]);
    await qi.bulkInsert('storage', [{ id: 1, userId: 1, itemId: 10, color: 'default', caseId: 'dust2', status: 'inventory' }]);
    await qi.bulkInsert('provably_fair_seeds', [{
        id: 1, userId: 1, serverSeed: WIN_SEED, serverSeedHash: sha256(WIN_SEED), clientSeed: CLIENT_SEED,
        nonce: NONCE, status: 'active', created_at: new Date(),
    }]);
    client = await connectClient(server.address().port);
});

test.afterEach(async () => {
    if (client) { await client.close(); client = null; }
});

const request = async (path = '/api/upgrade', body = BODY, signedIn = true) => {
    const headers = { 'Content-Type': 'application/json' };
    if (signedIn) { headers.Authorization = `Bearer ${signToken({ user_id: 1 })}`; }
    const response = await fetch(`${url}${path}`, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    return { status: response.status, payload: await response.json() };
};

const drops = async () => {
    await client.request('flush');
    return client.events('new-drop');
};

test('a win broadcasts exactly one contract-shaped drop after its transaction commits', async (t) => {
    let transaction;
    const bump = PFService.bumpNonce;
    t.mock.method(PFService, 'bumpNonce', async function tracked(id, nonce, options) {
        transaction = options.transaction;
        return bump.call(this, id, nonce, options);
    });
    const states = [];
    const emit = io.emit;
    t.mock.method(io, 'emit', function tracked(event, ...args) {
        if (event === 'new-drop') { states.push(transaction?.finished); }
        return emit.call(this, event, ...args);
    });
    const { status, payload } = await request();
    assert.equal(status, 200, JSON.stringify(payload));
    assert.equal(payload.data.won, true);
    assert.deepEqual(await drops(), [{
        user_login: 'winner', storage_id: payload.data.item.storage_id, storage_itemId: 20,
        storage_userId: 1, storage_caseId: null, storage_color: 'painted', source: 'upgrade',
    }]);
    assert.deepEqual(states, ['commit']);
    const [[record]] = await sequelize.query('SELECT resultStorageId FROM upgrades');
    assert.equal(record.resultStorageId, payload.data.item.storage_id);
});

test('a loss broadcasts no drop', async () => {
    const seed = seedFor(false);
    await sequelize.query('UPDATE provably_fair_seeds SET serverSeed = ?, serverSeedHash = ?', { replacements: [seed, sha256(seed)] });
    const { status, payload } = await request();
    assert.equal(status, 200);
    assert.equal(payload.data.won, false);
    assert.deepEqual(await drops(), []);
});

test('validation, authentication, stale chance and unavailable-stake refusals broadcast nothing', async () => {
    const results = [
        await request('/api/upgrade', {}),
        await request('/api/upgrade', BODY, false),
        await request('/api/upgrade', { ...BODY, expectedThreshold: 450001 }),
        await request('/api/upgrade', { ...BODY, storageIds: [999] }),
    ];
    assert.deepEqual(results.map(({ status }) => status), [422, 401, 409, 422]);
    assert.deepEqual(await drops(), []);
});

test('a transaction that rolls back its winning item never broadcasts a drop', async (t) => {
    t.mock.method(PFService, 'bumpNonce', async () => { throw new Error('nonce write failed'); });
    const errors = t.mock.method(console, 'error', () => {});
    assert.equal((await request()).status, 500);
    assert.deepEqual(await drops(), []);
    assert.equal(errors.mock.callCount(), 1);
    const [[row]] = await sequelize.query('SELECT COUNT(*) AS count FROM storage');
    assert.equal(row.count, 1);
});

test('a case open broadcasts its existing fields with source case', async (t) => {
    t.mock.method(console, 'log', () => {});
    const allCases = require('../src/constant/cases/_all');
    itemHash = Object.fromEntries(allCases.dust2.ITEMS.map((item) => [item.id, JSON.stringify({
        name: `Case item ${item.id}`, type: 'rifles', rare: item.rare, item_imagePath: `/img/${item.id}.webp`,
        pricesInCredits: JSON.stringify({ default: 10, painted: 20 }),
    })]));
    await sequelize.query("INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) "
        + "VALUES ('dust2', 'DUST2', 100, 0, 1, 1, 0, 'weapon', -1)");
    const { status, payload } = await request('/api/case/open', { id: 'dust2', count: 1 });
    assert.equal(status, 200, JSON.stringify(payload));
    const { winner } = payload.data[0];
    assert.deepEqual(await drops(), [{
        user_login: 'winner', storage_id: winner.storageId, storage_itemId: winner.item.id,
        storage_userId: 1, storage_caseId: 'dust2', storage_color: winner.item.color, source: 'case',
    }]);
});

test('the public recent-wins list distinguishes upgrade wins from consumed case drops', async () => {
    const result = await request();
    assert.equal(result.status, 200);
    const response = await fetch(`${url}/api/storage/list-userinfo/40`);
    assert.equal(response.status, 200);
    const { data, itemList, userList } = await response.json();
    assert.deepEqual(data, [
        { storage_id: 2, storage_itemId: 20, storage_userId: 1, storage_caseId: null, storage_color: 'painted', source: 'upgrade' },
        { storage_id: 1, storage_itemId: 10, storage_userId: 1, storage_caseId: 'dust2', storage_color: 'default', source: 'case' },
    ]);
    assert.equal(itemList[20].item_name, 'Item 20');
    assert.equal(userList[1].user_login, 'winner');
    assert.ok(!JSON.stringify(userList).includes('winner@e.ua'));
});

test('a win still completes when no socket server is attached', async () => {
    socketAvailable = false;
    const { status, payload } = await request();
    assert.equal(status, 200);
    assert.equal(payload.data.won, true);
    assert.deepEqual(await drops(), []);
});

test('performUpgrade leaves broadcasting to its controller', async () => {
    const result = await UpgradeService.performUpgrade({ userId: 1, ...BODY });
    assert.equal(result.won, true);
    assert.deepEqual(await drops(), []);
});
