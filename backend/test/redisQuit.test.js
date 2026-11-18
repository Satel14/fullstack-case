const { assertSafeTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const sequelize = require('../src/config/db');

test.before(() => assertSafeTestDatabase());
test.after(() => sequelize.close());

test('quitting an offline Redis clears its queued reconnect so the process can exit naturally', async () => {
    const port = await new Promise((resolve) => {
        const listener = net.createServer();
        listener.listen(0, '127.0.0.1', () => {
            const address = listener.address();
            listener.close(() => resolve(address.port));
        });
    });
    const script = `
        const { assertSafeTestDatabase } = require('./test/helpers/db');
        assertSafeTestDatabase();
        const manager = require('./src/redis/manager');
        const sequelize = require('./src/config/db');
        setTimeout(async () => {
            await manager.quit();
            await sequelize.close();
            console.log('RESULT quit');
            setTimeout(() => {
                console.log('RESULT reconnect timer survived quit');
                process.exit(2);
            }, 80).unref();
        }, 50);
    `;
    const result = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['-e', script], {
            cwd: path.join(__dirname, '..'),
            env: { ...process.env, NODE_ENV: 'development', REDIS_HOST: '127.0.0.1', REDIS_PORT: String(port) },
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.on('error', reject);
        child.on('close', (code) => resolve({ code, stdout, stderr }));
    });
    assert.strictEqual(result.code, 0, result.stdout + result.stderr);
    assert.strictEqual(result.stdout.trim(), 'RESULT quit');
});
