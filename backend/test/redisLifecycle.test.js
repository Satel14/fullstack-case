const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeRedis } = require('./helpers/fakeRedis');
const flush = () => new Promise((resolve) => setImmediate(resolve));

const fresh = ({ ready = false, getItems = async () => [] } = {}) => {
    const fake = createFakeRedis();
    fake.client.ready = ready;
    fake.client.ping = (callback) => callback(null, 'PONG');
    fake.client.quit = (callback) => callback(null, 'OK');
    fake.client.end = () => {};
    const timers = new Map();
    const logged = [];
    const dependencies = {
        redis: { createClient: () => fake.client },
        './../services/insiderPrices': { getAllItems: async () => [] },
        './../services/item': { getAllItems: getItems },
        './itemHash': require('../src/redis/itemHash'),
        '../helpers/failure': require('../src/helpers/failure'),
    };
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src/redis/manager.js'), 'utf8'), {
        module,
        require: (name) => {
            assert.ok(Object.hasOwn(dependencies, name), `unexpected dependency: ${name}`);
            return dependencies[name];
        },
        process: { env: {} },
        console: Object.fromEntries(['log', 'info', 'warn', 'error'].map((name) => [name, (...args) => logged.push({ name, args })])),
        setTimeout: (fn, ms) => {
            const timer = { unref() {} };
            timers.set(timer, { fn, ms });
            return timer;
        },
        clearTimeout: (timer) => timers.delete(timer),
    }, { filename: 'redis/manager.js' });
    return { manager: module.exports, client: fake.client, timers, logged };
};

test('Redis health PING uses the existing client and resolves only for PONG', async () => {
    const { manager, client, logged } = fresh();
    assert.strictEqual(typeof manager.ping, 'function', 'the manager must expose PING');
    let calls = 0;
    client.ping = (callback) => { calls += 1; callback(null, 'PONG'); };
    assert.strictEqual(await manager.ping(), 'PONG');
    assert.strictEqual(calls, 1);
    client.ping = (callback) => callback(null, 'unexpected');
    await assert.rejects(() => manager.ping());
    client.ping = (callback) => callback(new Error('offline'));
    await assert.rejects(() => manager.ping(), /offline/);
    assert.deepStrictEqual(logged, []);
});

test('Redis quit waits for the client callback and propagates a failure without logging it', async () => {
    const { manager, client, logged } = fresh();
    assert.strictEqual(typeof manager.quit, 'function', 'the manager must expose graceful quit');
    let finish;
    const ended = [];
    client.end = (flush) => ended.push(flush);
    client.quit = (callback) => { finish = callback; };
    const quitting = manager.quit();
    let finished = false;
    quitting.then(() => { finished = true; });
    await flush();
    assert.strictEqual(finished, false);
    assert.deepStrictEqual(ended, []);
    finish(null, 'OK');
    await quitting;
    assert.strictEqual(finished, true);
    assert.deepStrictEqual(ended, [true]);
    client.quit = (callback) => callback(new Error('quit failed'));
    await assert.rejects(() => manager.quit(), /quit failed/);
    assert.deepStrictEqual(logged, []);
});

test('stopping item-cache sync detaches ready and prevents a later reconnect from reloading', async () => {
    let loads = 0;
    const { manager, client, timers } = fresh({ getItems: async () => { loads += 1; return []; } });
    const sync = manager.startItemCacheSync();
    assert.ok(sync && typeof sync.stop === 'function', 'cache sync must return a stop handle');
    assert.strictEqual(client.listenerCount('ready'), 1);
    await sync.stop();
    assert.strictEqual(client.listenerCount('ready'), 0);
    client.emit('ready');
    await flush();
    assert.strictEqual(loads, 0);
    assert.strictEqual(timers.size, 0);
});

test('stopping item-cache sync clears a queued reload retry', async () => {
    const { manager, client, timers } = fresh({ ready: true, getItems: async () => { throw new Error('database down'); } });
    const sync = manager.startItemCacheSync();
    await flush();
    assert.strictEqual(timers.size, 1);
    assert.ok(sync && typeof sync.stop === 'function');
    await sync.stop();
    assert.strictEqual(timers.size, 0);
    assert.strictEqual(client.listenerCount('ready'), 0);
});

for (const rejects of [false, true]) {
    test(`stopping item-cache sync waits for an active load that ${rejects ? 'fails' : 'succeeds'} without scheduling another`, async () => {
        const work = Promise.withResolvers();
        const { manager, client, timers, logged } = fresh({ ready: true, getItems: () => work.promise });
        const sync = manager.startItemCacheSync();
        assert.ok(sync && typeof sync.stop === 'function');
        await flush();
        const stopped = sync.stop();
        assert.ok(stopped && typeof stopped.then === 'function');
        let finished = false;
        stopped.then(() => { finished = true; });
        await flush();
        assert.strictEqual(finished, false);
        client.emit('ready');
        if (rejects) work.reject(new Error('late failure'));
        else work.resolve([]);
        await stopped;
        assert.strictEqual(finished, true);
        assert.strictEqual(timers.size, 0);
        assert.strictEqual(client.listenerCount('ready'), 0);
        assert.strictEqual(logged.filter(({ name }) => name === 'error').length, 0);
    });
}

test('repeated ready events serialize cache loads and preserve a reload requested during one', async () => {
    const work = Promise.withResolvers();
    let loads = 0;
    const { manager, client, timers } = fresh({
        ready: true,
        getItems: () => { loads += 1; return loads === 1 ? work.promise : Promise.resolve([]); },
    });
    const sync = manager.startItemCacheSync();
    assert.ok(sync && typeof sync.stop === 'function');
    await flush();
    client.emit('ready');
    client.emit('ready');
    await flush();
    assert.strictEqual(loads, 1);
    work.resolve([]);
    await flush();
    await flush();
    await flush();
    assert.strictEqual(loads, 2);
    await sync.stop();
    assert.strictEqual(timers.size, 0);
});
