const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { installShutdown } = require('../src/shutdown');

const boot = () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const exits = [];
    const started = [];
    const stopped = [];
    const logged = [];
    const processRef = new EventEmitter();
    processRef.env = { CI: 'true' };
    processRef.exit = (code) => exits.push(code);
    const health = { stop: () => stopped.push('health') };
    const sequelize = { close: async () => stopped.push('db') };
    const server = { close: (done) => { stopped.push('http'); done(); } };
    const io = { close: (done) => { stopped.push('socket'); done(); } };
    const cacheSync = { stop: async () => stopped.push('cache') };
    const withdrawal = { stop: async () => stopped.push('withdrawal') };
    const email = { stop: async () => stopped.push('email') };
    const upgraded = new Set();
    const tracked = [];
    const migrations = Promise.withResolvers();
    let lifecycle;
    let wiring;
    let attached = false;
    const chat = (httpServer) => {
        assert.strictEqual(httpServer, server);
        attached = true;
        started.push(['socket']);
    };
    chat.getIo = () => attached ? io : null;
    const redis = {
        startItemCacheSync: () => { started.push(['cache']); return cacheSync; },
        quit: async () => stopped.push('redis'),
    };
    const dependencies = {
        './app': {
            buildApp: () => ({
                locals: { health },
                listen: (port) => { started.push(['listen', port]); return server; },
            }),
        },
        './src/config/serverConfig': { port: 3003 },
        dotenv: { config: () => {} },
        './src/config/db': sequelize,
        './src/db/migrator': {
            assertMigrationsApplied: (connection) => {
                assert.strictEqual(connection, sequelize);
                return migrations.promise;
            },
        },
        './src/shutdown': {
            trackUpgrades: (httpServer) => { tracked.push(httpServer); return upgraded; },
            installShutdown: (options) => {
                wiring = options;
                lifecycle = installShutdown({ ...options, processRef, log: (line) => logged.push(line) });
                return lifecycle;
            },
        },
        './src/helpers/failure': require('../src/helpers/failure'),
        './src/socket/chat': chat,
        './src/redis/manager': redis,
        './src/services/withdrawal': { startSweep: () => { started.push(['withdrawal']); return withdrawal; } },
        './src/services/emailVerification': { startSweep: () => { started.push(['email']); return email; } },
    };

    vm.runInNewContext(source, {
        require: (name) => {
            if (Object.hasOwn(dependencies, name)) return dependencies[name];
            assert.ok(name.startsWith('./src/models/'), `unexpected dependency: ${name}`);
            return {};
        },
        process: processRef,
        console: { log: () => {}, error: (message) => assert.fail(message) },
    }, { filename: 'server.js' });

    return {
        exits, started, stopped, migrations, lifecycle, wiring, processRef,
        health, sequelize, server, io, cacheSync, withdrawal, email, redis, upgraded, tracked,
    };
};

test('CI does not exit the server before migrations finish and the listeners and workers start', async () => {
    const stand = boot();
    assert.deepStrictEqual(stand.exits, []);
    assert.deepStrictEqual(stand.started, []);
    assert.strictEqual(stand.processRef.listenerCount('SIGTERM'), 1, 'shutdown must be wired before migrations finish');
    assert.strictEqual(stand.processRef.listenerCount('SIGINT'), 1);
    assert.strictEqual(stand.wiring.health, stand.health);
    assert.strictEqual(stand.wiring.redis, stand.redis);
    assert.strictEqual(stand.wiring.sequelize, stand.sequelize);

    stand.migrations.resolve();
    await stand.migrations.promise;

    assert.deepStrictEqual(stand.exits, []);
    assert.deepStrictEqual(stand.started, [['listen', 3003], ['socket'], ['cache'], ['withdrawal'], ['email']]);
    const resources = stand.wiring.getResources();
    assert.strictEqual(resources.server, stand.server);
    assert.strictEqual(resources.io, stand.io);
    assert.strictEqual(resources.cacheSync, stand.cacheSync);
    assert.deepStrictEqual(Array.from(resources.sweeps), [stand.withdrawal, stand.email]);
    assert.deepStrictEqual(stand.tracked, [stand.server]);
    assert.strictEqual(resources.upgraded, stand.upgraded);
    stand.processRef.emit('SIGTERM');
    assert.strictEqual(await stand.lifecycle.finished, 0);
    assert.deepStrictEqual(stand.stopped, ['health', 'http', 'socket', 'withdrawal', 'email', 'cache', 'redis', 'db']);
    assert.deepStrictEqual(stand.exits, [0]);
});

test('a signal during the migration gate closes dependencies and prevents a later listen or worker start', async () => {
    const stand = boot();
    assert.strictEqual(stand.processRef.listenerCount('SIGINT'), 1);
    stand.processRef.emit('SIGINT');
    assert.strictEqual(await stand.lifecycle.finished, 0);
    stand.migrations.resolve();
    await stand.migrations.promise;

    assert.deepStrictEqual(stand.started, []);
    assert.deepStrictEqual(stand.stopped, ['health', 'redis', 'db']);
    assert.deepStrictEqual(stand.exits, [0]);
});
