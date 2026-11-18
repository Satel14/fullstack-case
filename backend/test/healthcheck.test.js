const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const serve = async (t, handler) => {
    const server = http.createServer(handler);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    return server;
};

for (const [status, body] of [
    [200, { status: 'ok', db: 'ok', redis: 'ok' }],
    [200, { status: 'degraded', db: 'ok', redis: 'fail' }],
    [503, { status: 'fail', db: 'fail', redis: 'ok' }],
    [503, { status: 'stopping' }],
]) {
    test(`the Docker probe maps ${body.status} to ${status === 200 ? 'healthy' : 'unhealthy'}`, async (t) => {
        const { checkHealth } = require('../scripts/healthcheck');
        const server = await serve(t, (req, res) => {
            assert.strictEqual(req.url, '/api/health');
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(body));
        });
        assert.strictEqual(await checkHealth({ port: server.address().port }), status === 200);
    });
}

test('the Docker probe quietly fails when the backend is unreachable', async (t) => {
    const { checkHealth } = require('../scripts/healthcheck');
    const server = await serve(t, (req, res) => res.end());
    const { port } = server.address();
    await new Promise((resolve) => server.close(resolve));
    assert.strictEqual(await checkHealth({ port }), false);
});

for (const stalled of ['headers', 'body']) {
    test(`the Docker probe bounds a backend that never finishes its ${stalled}`, async (t) => {
        const { checkHealth } = require('../scripts/healthcheck');
        const server = await serve(t, (req, res) => {
            if (stalled === 'body') {
                res.writeHead(200);
                res.flushHeaders();
            }
        });
        const started = Date.now();
        assert.strictEqual(await checkHealth({ port: server.address().port, timeoutMs: 30 }), false);
        assert.ok(Date.now() - started < 500);
    });
}

for (const status of [200, 503]) {
    test(`the Node healthcheck CLI exits ${status === 200 ? 0 : 1} without output for HTTP ${status}`, async (t) => {
        const server = await serve(t, (req, res) => { res.writeHead(status); res.end('{}'); });
        const result = await new Promise((resolve, reject) => {
            const child = spawn(process.execPath, [path.join(__dirname, '..', 'scripts/healthcheck.js')], {
                env: { ...process.env, SERVER_PORT: String(server.address().port) },
            });
            let output = '';
            child.stdout.on('data', (chunk) => { output += chunk; });
            child.stderr.on('data', (chunk) => { output += chunk; });
            child.on('error', reject);
            child.on('close', (code) => resolve({ code, output }));
        });
        assert.deepStrictEqual(result, { code: status === 200 ? 0 : 1, output: '' });
    });
}
