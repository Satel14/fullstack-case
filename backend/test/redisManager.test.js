const test = require('node:test');
const assert = require('node:assert');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const freePort = () => new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        server.close(() => resolve(port));
    });
});

const CHILD = `
const manager = require(${JSON.stringify(path.join(__dirname, '..', 'src', 'redis', 'manager'))});
setTimeout(() => {
    const started = Date.now();
    manager.getAllDataHashWithKey('item_hash')
        .then(() => ({ outcome: 'resolved' }))
        .catch((e) => ({ outcome: 'rejected', message: e.message }))
        .then((result) => {
            console.log('RESULT ' + JSON.stringify({ ...result, ms: Date.now() - started }));
            process.exit(0);
        });
}, 1500);
setTimeout(() => {
    console.log('RESULT ' + JSON.stringify({ outcome: 'hung' }));
    process.exit(0);
}, 6000);
`;

const runWithoutRedis = async () => {
    const port = await freePort();
    return new Promise((resolve) => {
        const child = spawn(process.execPath, ['-e', CHILD], {
            env: { ...process.env, NODE_ENV: 'development', REDIS_HOST: '127.0.0.1', REDIS_PORT: String(port) },
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.on('close', (code) => {
            const line = stdout.split('\n').find((l) => l.startsWith('RESULT '));
            resolve({ code, stderr, result: line ? JSON.parse(line.slice('RESULT '.length)) : null });
        });
    });
};

test('an unreachable Redis neither crashes the process nor hangs a command', async () => {
    const { code, stderr, result } = await runWithoutRedis();

    assert.strictEqual(code, 0, `the process died instead of surviving the outage:\n${stderr}`);
    assert.ok(result, `no result was printed:\n${stderr}`);
    assert.strictEqual(result.outcome, 'rejected', 'a command must fail fast while Redis is down, not wait for it');
    assert.ok(result.ms < 1000, `the command took ${result.ms}ms to fail`);
});

test('the client keeps reconnecting far beyond the one-hour node_redis default before giving up', async () => {
    const port = await freePort();
    const child = spawn(process.execPath, ['-e', `
        const { clientOptions } = require(${JSON.stringify(path.join(__dirname, '..', 'src', 'redis', 'manager'))});
        console.log('RESULT ' + JSON.stringify({ connectTimeout: clientOptions.connect_timeout }));
        process.exit(0);
    `], { env: { ...process.env, NODE_ENV: 'development', REDIS_HOST: '127.0.0.1', REDIS_PORT: String(port) } });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    await new Promise((resolve) => child.on('close', resolve));
    const line = stdout.split('\n').find((l) => l.startsWith('RESULT '));
    const { connectTimeout } = JSON.parse(line.slice('RESULT '.length));

    assert.ok(connectTimeout >= 24 * 24 * 60 * 60 * 1000, `connect_timeout ${connectTimeout} gives up too early`);
    assert.ok(connectTimeout <= 2147483647, 'values above 2^31-1 ms overflow the socket timer to 1 ms');
});
