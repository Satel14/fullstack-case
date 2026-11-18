const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('CI does not exit the server before migrations finish and the listeners and workers start', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const exits = [];
    const started = [];
    const sequelize = {};
    const server = {};
    let finishMigrations;
    const migrations = new Promise((resolve) => { finishMigrations = resolve; });
    const dependencies = {
        './app': {
            buildApp: () => ({
                listen: (port) => {
                    started.push(['listen', port]);
                    return server;
                },
            }),
        },
        './src/config/serverConfig': { port: 3003 },
        dotenv: { config: () => {} },
        './src/config/db': sequelize,
        './src/db/migrator': {
            assertMigrationsApplied: (connection) => {
                assert.strictEqual(connection, sequelize);
                return migrations;
            },
        },
        './src/socket/chat': (httpServer) => {
            assert.strictEqual(httpServer, server);
            started.push(['socket']);
        },
        './src/redis/manager': { startItemCacheSync: () => started.push(['cache']) },
        './src/services/withdrawal': { startSweep: () => started.push(['withdrawal']) },
        './src/services/emailVerification': { startSweep: () => started.push(['email']) },
    };

    vm.runInNewContext(source, {
        require: (name) => {
            if (Object.hasOwn(dependencies, name)) {
                return dependencies[name];
            }
            assert.ok(name.startsWith('./src/models/'), `unexpected dependency: ${name}`);
            return {};
        },
        process: { env: { CI: 'true' }, exit: (code) => exits.push(code) },
        console: { log: () => {}, error: (message) => assert.fail(message) },
    }, { filename: 'server.js' });

    assert.deepStrictEqual(exits, []);
    assert.deepStrictEqual(started, []);

    finishMigrations();
    await migrations;

    assert.deepStrictEqual(exits, []);
    assert.deepStrictEqual(started, [['listen', 3003], ['socket'], ['cache'], ['withdrawal'], ['email']]);
});
