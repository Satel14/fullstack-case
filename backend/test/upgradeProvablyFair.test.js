const { resetTestDatabase, assertSafeTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const sequelize = require('../src/config/db');
const Upgrade = require('../src/models/upgrade');
const PFService = require('../src/services/provablyFair');
const { upgradeRoll } = require('../src/modules/upgradeFair');
const { sha256 } = require('../src/modules/provablyFair');
const { signToken } = require('../src/auth/token');
const MESSAGE = require('../src/constant/responseMessages');

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true,
    exports: { getAllDataHashWithKey: async () => { throw new Error('Upgrade history and verification must not read Redis'); } },
};
const { buildApp } = require('../app');
const { verifyLimiter } = require('../src/middleware/rateLimiters');
const REVEALED = 'revealed-upgrade-server';
const ACTIVE = 'active-upgrade-server';
const OTHER = 'other-player-server';
const CLIENT = 'recorded-client';
const BODY = { serverSeed: REVEALED, clientSeed: CLIENT, nonce: 5 };
const HISTORY = '/api/profile/provably-fair/upgrades';
const VERIFY = '/api/provably-fair/verify-upgrade';
const makeRecord = (id, userId, seedId, serverSeed, nonce) => ({
    id, userId, seedId, serverSeedHash: sha256(serverSeed), clientSeed: CLIENT, nonce,
    stake: JSON.stringify([{ storageId: id + 100, itemId: 10, color: 'painted', price: '20.00' }]),
    stakeValue: '20.00', targetItemId: 20, targetColor: 'default', targetPrice: '40.00', threshold: 450000,
    roll: upgradeRoll(serverSeed, CLIENT, nonce), won: upgradeRoll(serverSeed, CLIENT, nonce) < 450000,
    resultStorageId: null, created_at: new Date('2026-01-01T00:00:00Z'),
});
const RECORDS = [makeRecord(10, 1, 1, REVEALED, 5), makeRecord(30, 1, 2, ACTIVE, 6),
    makeRecord(40, 1, 2, ACTIVE, 7), makeRecord(50, 2, 3, OTHER, 99)];
const historyItem = (row) => ({
    upgradeId: row.id, created_at: row.created_at.toISOString(), nonce: row.nonce, clientSeed: CLIENT,
    serverSeedHash: row.serverSeedHash, revealedServerSeed: row.seedId === 1 ? REVEALED : null,
    stake: [{ itemId: 10, color: 'painted', price: '20.00' }], stakeValue: '20.00', targetItemId: 20,
    targetColor: 'default', targetPrice: '40.00', threshold: row.threshold, roll: row.roll, won: row.won,
});
let server;
let url;

test.before(async () => {
    assertSafeTestDatabase();
    server = await new Promise((resolve) => {
        const listening = buildApp().listen(0, '127.0.0.1', () => resolve(listening));
    });
    url = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    if (server) { await new Promise((resolve) => server.close(resolve)); }
    await sequelize.close();
});

test.beforeEach(async () => {
    await resetTestDatabase();
    verifyLimiter.resetKey('127.0.0.1');
    const qi = sequelize.getQueryInterface();
    await qi.bulkInsert('users', [1, 2, 3].map((id) => ({ id, login: `player${id}`, email: `player${id}@e.ua`, password: 'x', role: 1 })));
    await qi.bulkInsert('provably_fair_seeds', [
        { id: 1, userId: 1, serverSeed: REVEALED, status: 'revealed' },
        { id: 2, userId: 1, serverSeed: ACTIVE, status: 'active' },
        { id: 3, userId: 2, serverSeed: OTHER, status: 'revealed' },
    ].map((seed) => ({ ...seed, serverSeedHash: sha256(seed.serverSeed), clientSeed: 'current-client', nonce: 8, created_at: new Date() })));
    await qi.bulkInsert('upgrades', RECORDS);
});

const request = async (path, body, userId) => {
    const headers = { 'Content-Type': 'application/json' };
    if (userId !== undefined) { headers.Authorization = `Bearer ${signToken({ user_id: userId })}`; }
    const response = await fetch(`${url}${path}`, {
        method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
    });
    const content = await response.text();
    let payload;
    try { payload = JSON.parse(content); } catch { payload = content; }
    return { status: response.status, payload };
};
const history = (query = '', userId = 1) => request(`${HISTORY}${query}`, undefined, userId);
const verify = (body = BODY) => request(VERIFY, body);
const catchLogs = (t) => {
    const logs = [];
    for (const method of ['log', 'info', 'debug', 'warn', 'error', 'trace', 'dir', 'table']) {
        t.mock.method(console, method, (...args) => logs.push({ method, args }));
    }
    return logs;
};

test('history contains only the signed-in player records, newest first, with exact public fields', async (t) => {
    const logs = catchLogs(t);
    const { status, payload } = await history();
    assert.equal(status, 200, JSON.stringify(payload));
    assert.deepEqual(payload, { status: 200, data: { items: [RECORDS[2], RECORDS[1], RECORDS[0]].map(historyItem), total: 3 } });
    for (const secret of [ACTIVE, OTHER, 'storageId', 'userId', 'seedId', 'resultStorageId', 'current-client']) {
        assert.ok(!JSON.stringify(payload).includes(secret), secret);
    }
    const other = await history('', 2);
    assert.deepEqual(other.payload.data, { items: [{ ...historyItem(RECORDS[3]), revealedServerSeed: OTHER }], total: 1 });
    assert.deepEqual((await history('', 3)).payload, { status: 200, data: { items: [], total: 0 } });
    assert.deepEqual(logs, []);
});

test('history requires authentication', async (t) => {
    const logs = catchLogs(t);
    const { status, payload } = await request(HISTORY);
    assert.equal(status, 401);
    assert.equal(payload.code, 'AUTH.NOT_AUTHORIZED');
    assert.deepEqual(logs, []);
});

test('history pages by limit and offset while total remains scoped and unpaged', async () => {
    assert.deepEqual((await history('?limit=1&offset=1')).payload.data, { items: [historyItem(RECORDS[1])], total: 3 });
    assert.deepEqual((await history('?limit=2&offset=2')).payload.data, { items: [historyItem(RECORDS[0])], total: 3 });
    for (const offset of [3, 2147483647]) {
        assert.deepEqual((await history(`?limit=50&offset=${offset}`)).payload.data, { items: [], total: 3 });
    }
});

test('history defaults to 50 records and batches revealed seed lookups', async (t) => {
    await sequelize.getQueryInterface().bulkInsert('upgrades', Array.from({ length: 60 }, (_, i) => makeRecord(100 + i, 1, 1, REVEALED, i + 10)));
    const original = sequelize.query;
    const queries = [];
    t.mock.method(sequelize, 'query', function tracked(...args) { queries.push(args[0]); return original.apply(this, args); });
    const { status, payload } = await history();
    assert.equal(status, 200);
    assert.equal(payload.data.total, 63);
    assert.deepEqual(payload.data.items.map(({ upgradeId }) => upgradeId), Array.from({ length: 50 }, (_, i) => 159 - i));
    assert.equal(queries.filter((sql) => typeof sql === 'string' && sql.includes('FROM `provably_fair_seeds`')).length, 1);
});

test('rotation reveals the recorded seed without replacing the historical client seed or prices', async () => {
    assert.equal((await history('?limit=1')).payload.data.items[0].revealedServerSeed, null);
    await PFService.rotateSeed(1);
    const { payload } = await history('?limit=1');
    assert.deepEqual(payload.data.items, [{ ...historyItem(RECORDS[2]), revealedServerSeed: ACTIVE }]);
});

test('a bad seed reference never exposes another player revealed server seed', async () => {
    await sequelize.query('UPDATE upgrades SET seedId = 3 WHERE id = 40');
    const { status, payload } = await history('?limit=1');
    assert.equal(status, 200);
    assert.equal(payload.data.items[0].revealedServerSeed, null);
    assert.ok(!JSON.stringify(payload).includes(OTHER));
});

test('malformed, duplicate, list and unknown history query fields are refused quietly', async (t) => {
    const logs = catchLogs(t);
    const invalid = ['limit=a', 'limit=', 'limit=0', 'limit=51', 'limit=1.5', 'offset=-1', 'offset=1.5', 'offset=2147483648',
        'limit[]=1', 'offset[]=0', 'limit[x]=1', 'offset[x]=0', 'limit=1&limit=2', 'offset=0&offset=1', 'userId=2'];
    for (const query of invalid) {
        const { status, payload } = await history(`?${query}`);
        assert.equal(status, 422, query);
        assert.equal(payload.code, 'VALIDATOR.ERROR');
    }
    assert.deepEqual(logs, []);
});

test('standalone verification is public and computes a roll without the database or Redis', async (t) => {
    t.mock.method(sequelize, 'query', async () => { throw new Error('Standalone verification must not query the database'); });
    const logs = catchLogs(t);
    const roll = upgradeRoll(REVEALED, CLIENT, 5);
    assert.deepEqual(await verify(), { status: 200, payload: { status: 200, data: { roll, threshold: null, won: null } } });
    for (const threshold of [0, roll, roll + 1, 1000000]) {
        assert.deepEqual((await verify({ ...BODY, threshold })).payload, { status: 200, data: { roll, threshold, won: roll < threshold } });
    }
    assert.deepEqual(logs, []);
});

test('verification by id uses the stored threshold and returns only the calculation and comparison flags', async (t) => {
    const logs = catchLogs(t);
    for (const threshold of [undefined, 0, 1000000]) {
        assert.deepEqual(await verify({ ...BODY, upgradeId: 10, threshold }), {
            status: 200, payload: { status: 200, data: {
                roll: RECORDS[0].roll, threshold: 450000, won: RECORDS[0].won,
                seedMatches: true, inputsMatchRecord: true, matchesRecord: true,
            } },
        });
    }
    assert.deepEqual(logs, []);
});

test('verification never confirms different client seeds or nonces even when the win outcome is the same', async () => {
    for (const changed of [{ clientSeed: `${CLIENT}x` }, { nonce: 6 }, { serverSeed: 'wrong-server' }]) {
        const body = { ...BODY, upgradeId: 10, ...changed };
        const { status, payload } = await verify(body);
        assert.equal(status, 200);
        assert.deepEqual(payload.data, {
            roll: upgradeRoll(body.serverSeed, body.clientSeed, body.nonce), threshold: 450000,
            won: upgradeRoll(body.serverSeed, body.clientSeed, body.nonce) < 450000,
            seedMatches: body.serverSeed === REVEALED,
            inputsMatchRecord: body.clientSeed === CLIENT && body.nonce === 5,
            matchesRecord: false,
        });
    }
});

test('verification compares both the recorded roll and outcome, with seed matching reported separately', async () => {
    await sequelize.query('UPDATE upgrades SET roll = roll + 1 WHERE id = 10');
    assert.equal((await verify({ ...BODY, upgradeId: 10 })).payload.data.matchesRecord, false);
    await sequelize.query('UPDATE upgrades SET roll = ?, won = NOT won WHERE id = 10', { replacements: [RECORDS[0].roll] });
    assert.equal((await verify({ ...BODY, upgradeId: 10 })).payload.data.matchesRecord, false);
    await sequelize.query('UPDATE upgrades SET won = ?, serverSeedHash = ? WHERE id = 10', { replacements: [RECORDS[0].won, '0'.repeat(64)] });
    const { payload } = await verify({ ...BODY, upgradeId: 10 });
    assert.equal(payload.data.seedMatches, false);
    assert.equal(payload.data.matchesRecord, true);
});

test('public verification of another player record exposes no player, stake or stored seed inputs', async () => {
    const body = { serverSeed: 'guessed-server', clientSeed: 'guessed-client', nonce: 0, upgradeId: 50 };
    const roll = upgradeRoll(body.serverSeed, body.clientSeed, 0);
    const expected = { status: 200, payload: { status: 200, data: {
        roll, threshold: 450000, won: roll < 450000, seedMatches: false, inputsMatchRecord: false, matchesRecord: false,
    } } };
    assert.deepEqual(await verify(body), expected);
    assert.deepEqual(await request(VERIFY, body, 1), expected);
});

test('an unknown upgrade id returns the catalogue refusal without logging', async (t) => {
    const logs = catchLogs(t);
    const { status, payload } = await verify({ ...BODY, upgradeId: 999 });
    assert.equal(status, 422);
    assert.deepEqual(payload, { status: 422, message: MESSAGE.PROVABLY_FAIR.UPGRADE_NOT_FOUND, code: 'PROVABLY_FAIR.UPGRADE_NOT_FOUND' });
    assert.deepEqual(logs, []);
});

test('verification rejects malformed scalars, arrays and overlong seeds before querying', async (t) => {
    const queries = t.mock.method(sequelize, 'query', async () => { throw new Error('Invalid input must not query the database'); });
    const logs = catchLogs(t);
    const invalid = [
        {}, ...['serverSeed', 'clientSeed', 'nonce'].map((key) => ({ ...BODY, [key]: undefined })),
        ...['serverSeed', 'clientSeed', 'nonce', 'threshold', 'upgradeId'].flatMap((key) =>
            [null, [], ['1'], ['1', '2'], {}, true].map((value) => ({ ...BODY, [key]: value }))),
        ...['', 'x'.repeat(129)].map((serverSeed) => ({ ...BODY, serverSeed })),
        ...['', 'x'.repeat(65), `x${'\uFE0F'.repeat(64)}`].map((clientSeed) => ({ ...BODY, clientSeed })),
        ...[-1, 1.5, '1e2', Number.MAX_SAFE_INTEGER + 1].map((nonce) => ({ ...BODY, nonce })),
        ...[-1, 1000001, 0.5, ''].map((threshold) => ({ ...BODY, threshold })),
        ...[0, -1, 1.5, '', 2147483648].map((upgradeId) => ({ ...BODY, upgradeId })),
    ];
    for (const body of invalid) {
        verifyLimiter.resetKey('127.0.0.1');
        const { status, payload } = await verify(body);
        assert.equal(status, 422, JSON.stringify(body));
        assert.equal(payload.code, 'VALIDATOR.ERROR');
    }
    assert.equal(queries.mock.callCount(), 0);
    assert.deepEqual(logs, []);
});

test('verification accepts full Unicode seed bounds and preserves meaningful whitespace', async () => {
    const body = { serverSeed: '😀'.repeat(128), clientSeed: '😀'.repeat(64), nonce: Number.MAX_SAFE_INTEGER, threshold: 1000000 };
    assert.deepEqual((await verify(body)).payload.data, { roll: upgradeRoll(body.serverSeed, body.clientSeed, body.nonce), threshold: 1000000, won: true });
    const spaces = { serverSeed: ' s ', clientSeed: ' c ', nonce: 0 };
    assert.equal((await verify(spaces)).payload.data.roll, upgradeRoll(spaces.serverSeed, spaces.clientSeed, 0));
    const { validate } = require('../src/controllers/provablyFair');
    const req = { body: { ...BODY, nonce: '5', upgradeId: '10', threshold: '0' } };
    await Promise.all(validate('verifyUpgrade').map((rule) => rule.run(req)));
    assert.ok(validationResult(req).isEmpty());
});

test('the public upgrade verifier shares the existing 30-per-minute verify limiter', async () => {
    for (let i = 0; i < 30; i += 1) { assert.equal((await verify({})).status, 422); }
    const blocked = await verify({});
    assert.equal(blocked.status, 429);
    assert.equal(blocked.payload.code, 'LIMIT.VERIFY');
    assert.equal((await request('/api/provably-fair/verify', {})).status, 429);
});

for (const endpoint of ['history', 'verification']) {
    test(`an unexpected ${endpoint} database failure uses answerFailure without exposing details`, async (t) => {
        t.mock.method(Upgrade, endpoint === 'history' ? 'findAndCountAll' : 'findByPk', async () => { throw new Error('private database failure'); });
        const logs = catchLogs(t);
        const { status, payload } = endpoint === 'history' ? await history() : await verify({ ...BODY, upgradeId: 10 });
        assert.equal(status, 500);
        assert.deepEqual(payload, { status: 500, message: MESSAGE.SERVER.ERROR, code: 'SERVER.ERROR' });
        assert.equal(logs.length, 1);
        assert.equal(logs[0].method, 'error');
        assert.match(logs[0].args[0], /^\[provably-fair\.[^\]]+\] unexpected error:$/);
    });
}
