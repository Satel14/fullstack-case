const { assertSafeTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert');

const managerPath = require.resolve('../src/redis/manager');
const redis = { getAllDataHashWithKey: async () => ({}), ping: async () => 'PONG' };
require.cache[managerPath] = { id: managerPath, filename: managerPath, loaded: true, exports: redis };

const sequelize = require('../src/config/db');
const { buildApp } = require('../app');
const deferred = () => Promise.withResolvers();
const flush = () => new Promise((resolve) => setImmediate(resolve));

test.before(() => assertSafeTestDatabase());
test.after(() => sequelize.close());

const serve = async (t, options) => {
    const health = options && require('../src/services/health').createHealth(options);
    const app = buildApp({ health });
    const server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    t.after(() => new Promise((resolve) => server.close(resolve)));
    return { app, health, url: `http://127.0.0.1:${server.address().port}/api/health` };
};

const catchLogs = (t) => {
    const logged = [];
    for (const method of ['log', 'info', 'debug', 'trace', 'dir', 'table', 'warn', 'error']) {
        t.mock.method(console, method, (...args) => logged.push({ method, args }));
    }
    return logged;
};

const request = (url) => fetch(url, { signal: AbortSignal.timeout(1000) });
const failure = () => Object.assign(new Error('private database address and password'), { sql: 'SECRET SQL' });

test('the public health endpoint checks the Sequelize pool and the existing Redis manager without logging', async (t) => {
    const query = t.mock.method(sequelize, 'query', async () => [[{ ok: 1 }], {}]);
    const ping = t.mock.method(redis, 'ping', async () => 'PONG');
    const stand = await serve(t);
    const logged = catchLogs(t);
    const response = await request(stand.url);

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { status: 'ok', db: 'ok', redis: 'ok' });
    assert.strictEqual(response.headers.get('cache-control'), 'no-store');
    assert.strictEqual(query.mock.callCount(), 1);
    assert.strictEqual(query.mock.calls[0].arguments[0], 'SELECT 1');
    assert.strictEqual(query.mock.calls[0].arguments[1].logging, false);
    assert.strictEqual(ping.mock.callCount(), 1);
    assert.deepStrictEqual(logged, []);
});

for (const [name, dbFails, redisFails, code, body] of [
    ['Redis alone is down', false, true, 200, { status: 'degraded', db: 'ok', redis: 'fail' }],
    ['MySQL alone is down', true, false, 503, { status: 'fail', db: 'fail', redis: 'ok' }],
    ['both dependencies are down', true, true, 503, { status: 'fail', db: 'fail', redis: 'fail' }],
]) {
    test(`health stays quiet and exposes only fixed states when ${name}`, async (t) => {
        t.mock.method(sequelize, 'query', async () => { if (dbFails) throw failure(); });
        t.mock.method(redis, 'ping', async () => { if (redisFails) throw failure(); return 'PONG'; });
        const stand = await serve(t);
        const logged = catchLogs(t);
        const response = await request(stand.url);

        assert.strictEqual(response.status, code);
        assert.deepStrictEqual(await response.json(), body);
        assert.deepStrictEqual(logged, []);
    });
}

for (const dependency of ['db', 'redis', 'both']) {
    test(`health bounds a hanging ${dependency} check`, async (t) => {
        const never = () => new Promise(() => {});
        const stand = await serve(t, {
            checkDb: dependency === 'redis' ? async () => {} : never,
            checkRedis: dependency === 'db' ? async () => 'PONG' : never,
            timeoutMs: 30,
        });
        const logged = catchLogs(t);
        const started = Date.now();
        const response = await request(stand.url);

        assert.strictEqual(response.status, dependency === 'redis' ? 200 : 503);
        assert.deepStrictEqual(await response.json(), {
            status: dependency === 'redis' ? 'degraded' : 'fail',
            db: dependency === 'redis' ? 'ok' : 'fail',
            redis: dependency === 'db' ? 'ok' : 'fail',
        });
        assert.ok(Date.now() - started < 500, 'the probe did not respect its timeout');
        assert.deepStrictEqual(logged, []);
    });
}

test('dependency checks start together and public probes share a single check without a rate-limit refusal', async (t) => {
    const db = deferred();
    const redisReply = deferred();
    const calls = [];
    const stand = await serve(t, {
        checkDb: () => { calls.push('db'); return db.promise; },
        checkRedis: () => { calls.push('redis'); return redisReply.promise; },
        timeoutMs: 500,
    });
    const first = stand.health.check();
    const responses = Promise.all(Array.from({ length: 35 }, () => request(stand.url)));
    await flush();
    assert.deepStrictEqual(calls, ['db', 'redis']);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.deepStrictEqual(calls, ['db', 'redis']);
    db.resolve();
    redisReply.resolve('PONG');
    await first;
    for (const response of await responses) {
        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(await response.json(), { status: 'ok', db: 'ok', redis: 'ok' });
    }
});

test('timed-out checks do not accumulate pool acquisitions and a late completion allows recovery', async (t) => {
    const db = deferred();
    let calls = 0;
    const stand = await serve(t, {
        checkDb: () => { calls += 1; return calls === 1 ? db.promise : Promise.resolve(); },
        checkRedis: async () => 'PONG',
        timeoutMs: 15,
    });
    for (let i = 0; i < 3; i += 1) {
        const response = await request(stand.url);
        assert.strictEqual(response.status, 503);
        await response.json();
    }
    assert.strictEqual(calls, 1);
    db.resolve();
    await flush();
    const recovered = await request(stand.url);
    assert.strictEqual(recovered.status, 200);
    assert.strictEqual(calls, 2);
    await recovered.json();
});

test('a late dependency rejection after the timeout is consumed without logging', async (t) => {
    const db = deferred();
    const stand = await serve(t, { checkDb: () => db.promise, checkRedis: async () => 'PONG', timeoutMs: 15 });
    const logged = catchLogs(t);
    const response = await request(stand.url);
    assert.strictEqual(response.status, 503);
    await response.json();
    db.reject(failure());
    await flush();
    assert.deepStrictEqual(logged, []);
});

test('stopping health answers 503 immediately and starts no dependency checks', async (t) => {
    const checks = [];
    const stand = await serve(t, {
        checkDb: () => checks.push('db'), checkRedis: () => checks.push('redis'), timeoutMs: 500,
    });
    const logged = catchLogs(t);
    stand.app.locals.health.stop();
    const response = await request(stand.url);

    assert.strictEqual(response.status, 503);
    assert.deepStrictEqual(await response.json(), { status: 'stopping' });
    assert.deepStrictEqual(checks, []);
    assert.deepStrictEqual(logged, []);
});

test('shutdown also releases probes that were already waiting on a dependency', async (t) => {
    const started = deferred();
    const stand = await serve(t, {
        checkDb: () => { started.resolve(); return new Promise(() => {}); },
        checkRedis: async () => 'PONG', timeoutMs: 5000,
    });
    const logged = catchLogs(t);
    const responsePromise = request(stand.url);
    await started.promise;
    stand.health.stop();
    const response = await responsePromise;

    assert.strictEqual(response.status, 503);
    assert.deepStrictEqual(await response.json(), { status: 'stopping' });
    assert.deepStrictEqual(logged, []);
});
