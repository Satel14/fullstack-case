const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const http = require('node:http');
const { Server } = require('socket.io');
const { connectClient } = require('./helpers/socketClient');
const flush = () => new Promise((resolve) => setImmediate(resolve));

const clock = () => {
    const pending = new Map();
    return {
        pending,
        setTimeout: (fn, ms) => {
            const timer = {};
            pending.set(timer, { fn, ms });
            return timer;
        },
        clearTimeout: (timer) => pending.delete(timer),
        fire: () => {
            for (const { fn } of [...pending.values()]) fn();
        },
    };
};

const fixture = (configure = () => {}) => {
    const { installShutdown } = require('../src/shutdown');
    const steps = [];
    const exits = [];
    const logged = [];
    const processRef = new EventEmitter();
    processRef.exit = (code) => exits.push(code);
    const timers = clock();
    const resources = {
        server: { close: (done) => { steps.push('http'); done(); } },
        io: { close: (done) => { steps.push('socket'); done(); } },
        sweeps: [
            { stop: async () => { steps.push('withdrawal'); } },
            { stop: async () => { steps.push('email'); } },
        ],
        cacheSync: { stop: async () => { steps.push('cache'); } },
    };
    const options = {
        health: { stop: () => { steps.push('stopping'); } },
        getResources: () => resources,
        redis: { quit: async () => { steps.push('redis'); } },
        sequelize: { close: async () => { steps.push('db'); } },
        processRef, timers, log: (line) => logged.push(line),
    };
    configure({ options, resources, steps });
    const lifecycle = installShutdown(options);
    return { lifecycle, options, resources, steps, exits, logged, processRef, timers };
};

for (const signal of ['SIGTERM', 'SIGINT']) {
    test(`${signal} drains resources in order, exits zero and writes exactly two lifecycle lines`, async () => {
        const stand = fixture();
        assert.strictEqual(stand.processRef.listenerCount(signal), 1);
        stand.processRef.emit(signal);
        assert.strictEqual(stand.lifecycle.isStopping(), true);
        assert.deepStrictEqual(stand.steps.slice(0, 3), ['stopping', 'http', 'socket']);
        assert.strictEqual(await stand.lifecycle.finished, 0);
        assert.deepStrictEqual(stand.steps, ['stopping', 'http', 'socket', 'withdrawal', 'email', 'cache', 'redis', 'db']);
        assert.deepStrictEqual(stand.exits, [0]);
        assert.strictEqual(stand.logged.length, 2);
        assert.match(stand.logged[0], new RegExp(signal));
        assert.match(stand.logged[1], /complete/);
        assert.ok(stand.logged.every((line) => !/[\r\n]/.test(line)));
        assert.strictEqual(stand.timers.pending.size, 0);
        assert.strictEqual(stand.processRef.listenerCount('SIGTERM'), 0);
        assert.strictEqual(stand.processRef.listenerCount('SIGINT'), 0);
    });
}

test('shutdown closes Socket.IO before waiting for HTTP to drain and keeps dependencies until both sweeps finish', async () => {
    const httpClosed = Promise.withResolvers();
    const socketClosed = Promise.withResolvers();
    const withdrawal = Promise.withResolvers();
    const email = Promise.withResolvers();
    const cache = Promise.withResolvers();
    const redis = Promise.withResolvers();
    const database = Promise.withResolvers();
    const stand = fixture(({ options, resources, steps }) => {
        resources.server.close = (done) => { steps.push('http'); httpClosed.promise.then(() => done()); };
        resources.io.close = (done) => { steps.push('socket'); socketClosed.promise.then(() => done()); };
        resources.sweeps[0].stop = () => { steps.push('withdrawal'); return withdrawal.promise; };
        resources.sweeps[1].stop = () => { steps.push('email'); return email.promise; };
        resources.cacheSync.stop = () => { steps.push('cache'); return cache.promise; };
        options.redis.quit = () => { steps.push('redis'); return redis.promise; };
        options.sequelize.close = () => { steps.push('db'); return database.promise; };
    });
    const finished = stand.lifecycle.shutdown('SIGTERM');
    assert.deepStrictEqual(stand.steps, ['stopping', 'http', 'socket']);
    socketClosed.resolve();
    await flush();
    assert.deepStrictEqual(stand.steps, ['stopping', 'http', 'socket']);
    httpClosed.resolve();
    await flush();
    assert.deepStrictEqual(stand.steps, ['stopping', 'http', 'socket', 'withdrawal', 'email']);
    withdrawal.resolve();
    await flush();
    assert.strictEqual(stand.steps.includes('cache'), false);
    email.resolve();
    await flush();
    assert.strictEqual(stand.steps.at(-1), 'cache');
    assert.strictEqual(stand.steps.includes('redis'), false);
    cache.resolve();
    await flush();
    assert.strictEqual(stand.steps.at(-1), 'redis');
    redis.resolve();
    await flush();
    assert.strictEqual(stand.steps.at(-1), 'db');
    assert.deepStrictEqual(stand.exits, []);
    database.resolve();
    assert.strictEqual(await finished, 0);
});

test('the default deadline is ten seconds and a second signal forces one nonzero exit', async () => {
    let now = 1000;
    const stand = fixture(({ options, resources, steps }) => {
        resources.server.close = () => { steps.push('http'); };
        options.now = () => now;
    });
    stand.processRef.emit('SIGTERM');
    assert.deepStrictEqual([...stand.timers.pending.values()].map(({ ms }) => ms), [10000]);
    now += 1500;
    stand.processRef.emit('SIGINT');
    assert.strictEqual(await stand.lifecycle.finished, 1);
    stand.timers.fire();
    assert.deepStrictEqual(stand.exits, [1]);
    assert.strictEqual(stand.logged.length, 2);
    assert.match(stand.logged[1], /forced.*SIGINT/);
    assert.strictEqual(stand.timers.pending.size, 0);
});

for (const blocked of ['http', 'socket', 'withdrawal', 'email', 'cache', 'redis', 'db']) {
    test(`the deadline forces exit one when ${blocked} never finishes`, async () => {
        const work = Promise.withResolvers();
        const stand = fixture(({ options, resources }) => {
            if (blocked === 'http' || blocked === 'socket') {
                const target = blocked === 'http' ? resources.server : resources.io;
                target.close = (done) => { work.promise.then(() => done()); };
            } else if (blocked === 'withdrawal' || blocked === 'email') {
                resources.sweeps[blocked === 'withdrawal' ? 0 : 1].stop = () => work.promise;
            } else if (blocked === 'cache') resources.cacheSync.stop = () => work.promise;
            else if (blocked === 'redis') options.redis.quit = () => work.promise;
            else options.sequelize.close = () => work.promise;
        });
        stand.lifecycle.shutdown('SIGTERM');
        await flush();
        stand.timers.fire();
        assert.strictEqual(await stand.lifecycle.finished, 1);
        assert.deepStrictEqual(stand.exits, [1]);
        assert.strictEqual(stand.logged.length, 2);
        assert.match(stand.logged[1], /forced.*deadline/);
        work.resolve();
        await flush();
        assert.deepStrictEqual(stand.exits, [1]);
        assert.strictEqual(stand.logged.length, 2);
    });
}

test('a cleanup failure still closes later resources and is logged once with safe error text', async () => {
    const stand = fixture(({ options }) => {
        options.redis.quit = async () => {
            throw Object.assign(new Error('quit failed\nsecond line'), { sql: 'SECRET SQL', parameters: ['SECRET VALUE'] });
        };
    });
    assert.strictEqual(await stand.lifecycle.shutdown('SIGTERM'), 1);
    assert.ok(stand.steps.includes('db'));
    assert.deepStrictEqual(stand.exits, [1]);
    assert.strictEqual(stand.logged.length, 2);
    assert.match(stand.logged[1], /quit failed/);
    assert.doesNotMatch(stand.logged[1], /SECRET|[\r\n]/);
});

test('a rejected Socket.IO close promise is handled even if its callback is never called', async () => {
    const stand = fixture(({ resources }) => {
        resources.io.close = async () => { throw new Error('adapter failed'); };
    });
    assert.strictEqual(await stand.lifecycle.shutdown('SIGTERM'), 1);
    assert.ok(stand.steps.includes('db'));
    assert.match(stand.logged[1], /adapter failed/);
});

test('Socket.IO closing the same HTTP server twice is harmless', async () => {
    const stand = fixture(({ resources }) => {
        resources.io.close = (done) => done(Object.assign(new Error('already closed'), { code: 'ERR_SERVER_NOT_RUNNING' }));
    });
    assert.strictEqual(await stand.lifecycle.shutdown('SIGTERM'), 0);
    assert.deepStrictEqual(stand.exits, [0]);
});

test('shutdown before listen still closes Redis and the pool', async () => {
    const stand = fixture(({ options }) => { options.getResources = () => ({}); });
    assert.strictEqual(await stand.lifecycle.shutdown('SIGTERM'), 0);
    assert.deepStrictEqual(stand.steps, ['stopping', 'redis', 'db']);
});

test('real HTTP requests drain and a real Socket.IO WebSocket closes before the pool', { timeout: 3000 }, async (t) => {
    const { installShutdown } = require('../src/shutdown');
    const entered = Promise.withResolvers();
    const release = Promise.withResolvers();
    const server = http.createServer(async (req, res) => {
        entered.resolve();
        await release.promise;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
    });
    const io = new Server(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => { release.resolve(); return new Promise((resolve) => io.close(resolve)); });
    const client = await connectClient(server.address().port);
    t.after(() => client.close());
    const socketClosed = new Promise((resolve) => Object.values(io.engine.clients)[0].once('close', resolve));
    const response = fetch(`http://127.0.0.1:${server.address().port}/slow`, { headers: { Connection: 'close' } });
    await entered.promise;
    const steps = [];
    const processRef = new EventEmitter();
    processRef.exit = (code) => steps.push(`exit:${code}`);
    const lifecycle = installShutdown({
        health: { stop: () => steps.push('stopping') },
        getResources: () => ({ server, io }),
        redis: { quit: async () => steps.push('redis') },
        sequelize: { close: async () => steps.push('db') },
        processRef, log: () => {},
    });
    processRef.emit('SIGTERM');
    assert.strictEqual(server.listening, false);
    await socketClosed;
    assert.strictEqual(steps.includes('db'), false);
    release.resolve();
    const answer = await response;
    assert.strictEqual(answer.status, 200);
    assert.deepStrictEqual(await answer.json(), { ok: true });
    assert.strictEqual(await lifecycle.finished, 0);
    assert.deepStrictEqual(steps, ['stopping', 'redis', 'db', 'exit:0']);
});

test('a signal repeated within a second, as npm forwards a Ctrl+C the terminal already sent, does not force the exit', async () => {
    let now = 1000;
    const http = Promise.withResolvers();
    const stand = fixture(({ options, resources, steps }) => {
        resources.server.close = (done) => { steps.push('http'); http.promise.then(() => done()); };
        options.now = () => now;
    });
    stand.processRef.emit('SIGINT');
    now += 20;
    stand.processRef.emit('SIGINT');
    now += 900;
    stand.processRef.emit('SIGTERM');
    assert.deepStrictEqual(stand.exits, []);

    http.resolve();
    assert.strictEqual(await stand.lifecycle.finished, 0);
    assert.deepStrictEqual(stand.exits, [0]);
    assert.strictEqual(stand.logged.length, 2);
});

test('a WebSocket whose peer never answers the close frame is cut after a short grace, so the drain finishes', { timeout: 5000 }, async (t) => {
    const { installShutdown, trackUpgrades } = require('../src/shutdown');
    const WebSocket = require('ws');
    const server = http.createServer();
    const io = new Server(server);
    const upgraded = trackUpgrades(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => { server.close(() => resolve()); }));
    const peer = new WebSocket(`ws://127.0.0.1:${server.address().port}/socket.io/?EIO=4&transport=websocket`);
    await new Promise((resolve) => peer.once('open', resolve));
    t.after(() => peer.terminate());
    peer._socket.pause();
    assert.strictEqual(upgraded.size, 1);

    const steps = [];
    const processRef = new EventEmitter();
    processRef.exit = (code) => steps.push(`exit:${code}`);
    const started = process.hrtime.bigint();
    const lifecycle = installShutdown({
        health: { stop: () => {} },
        getResources: () => ({ server, io, upgraded }),
        redis: { quit: async () => steps.push('redis') },
        sequelize: { close: async () => steps.push('db') },
        processRef, log: () => {},
    });
    processRef.emit('SIGTERM');

    assert.strictEqual(await lifecycle.finished, 0);
    assert.ok(Number(process.hrtime.bigint() - started) / 1e6 < 4000, 'the drain waited for the peer instead of cutting it');
    assert.deepStrictEqual(steps, ['redis', 'db', 'exit:0']);
    assert.ok([...upgraded].every((socket) => socket.destroyed));
});
