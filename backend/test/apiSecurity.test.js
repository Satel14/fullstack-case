const { assertSafeTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert');
const { restoreEnv } = require('./helpers/env');

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

const sequelize = require('../src/config/db');
const ModuleService = require('../src/services/module');
const MESSAGE = require('../src/constant/responseMessages');
const { buildApp } = require('../app');
const chat = require('../src/socket/chat');

const originalOrigin = process.env.CLIENT_ORIGIN;
const normalAnswer = { status: 200, data: [] };

test.before(() => {
    assertSafeTestDatabase();
    test.mock.method(ModuleService, 'getAllModules', async () => []);
});

test.beforeEach(() => {
    delete process.env.CLIENT_ORIGIN;
});

test.afterEach(() => {
    restoreEnv('CLIENT_ORIGIN', originalOrigin);
});

test.after(async () => {
    await sequelize.close();
});

const serve = async (t) => {
    const server = await new Promise((resolve) => {
        const s = buildApp().listen(0, '127.0.0.1', () => resolve(s));
    });
    t.after(() => new Promise((resolve) => { server.close(resolve); }));
    return { server, url: `http://127.0.0.1:${server.address().port}` };
};

const catchLogs = (t) => {
    const logged = [];
    for (const method of ['log', 'info', 'debug', 'trace', 'dir', 'table', 'warn', 'error']) {
        t.mock.method(console, method, (...args) => logged.push({ method, args }));
    }
    return logged;
};

const headerTokens = (response, name) => (response.headers.get(name) || '')
    .split(',').map((value) => value.trim().toLowerCase());

const assertSecurityHeaders = (response) => {
    const expected = {
        'content-security-policy': "default-src 'none';base-uri 'none';form-action 'none';frame-ancestors 'none'",
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-resource-policy': 'same-origin',
        'origin-agent-cluster': '?1',
        'referrer-policy': 'strict-origin',
        'x-content-type-options': 'nosniff',
        'x-dns-prefetch-control': 'off',
        'x-download-options': 'noopen',
        'x-frame-options': 'DENY',
        'x-permitted-cross-domain-policies': 'none',
        'x-xss-protection': '0',
    };
    for (const [name, value] of Object.entries(expected)) {
        assert.strictEqual(response.headers.get(name), value, name);
    }
    for (const name of ['x-powered-by', 'strict-transport-security', 'cross-origin-embedder-policy']) {
        assert.strictEqual(response.headers.get(name), null, name);
    }
};

for (const [name, configuredOrigin, allowedOrigin] of [
    ['default', undefined, 'http://localhost:3000'],
    ['configured', 'https://cases.example', 'https://cases.example'],
]) {
    test(`the ${name} client origin gets CORS access to a normal JSON answer`, async (t) => {
        restoreEnv('CLIENT_ORIGIN', configuredOrigin);
        const stand = await serve(t);
        const response = await fetch(`${stand.url}/api/module/all`, { headers: { Origin: allowedOrigin } });

        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(await response.json(), normalAnswer);
        assert.strictEqual(response.headers.get('access-control-allow-origin'), allowedOrigin);
        assert.ok(headerTokens(response, 'vary').includes('origin'));
    });
}

test('other origins get no CORS access, a normal JSON answer and no log line', async (t) => {
    process.env.CLIENT_ORIGIN = 'https://cases.example';
    const stand = await serve(t);
    const logged = catchLogs(t);

    for (const origin of ['https://other.example', 'http://localhost:3000', 'https://cases.example.evil.test', 'null']) {
        const response = await fetch(`${stand.url}/api/module/all`, { headers: { Origin: origin } });

        assert.strictEqual(response.status, 200, origin);
        assert.deepStrictEqual(await response.json(), normalAnswer, origin);
        assert.strictEqual(response.headers.get('access-control-allow-origin'), null, origin);
        assert.ok(headerTokens(response, 'vary').includes('origin'), origin);
    }
    assert.deepStrictEqual(logged, []);
});

test('a request without Origin gets a normal JSON answer without a log line', async (t) => {
    const stand = await serve(t);
    const logged = catchLogs(t);
    const response = await fetch(`${stand.url}/api/module/all`);

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), normalAnswer);
    assert.strictEqual(response.headers.get('access-control-allow-origin'), null);
    assert.deepStrictEqual(logged, []);
});

test('an allowed JSON and Bearer-token preflight succeeds and carries the security headers', async (t) => {
    const stand = await serve(t);
    const response = await fetch(`${stand.url}/api/profile/login`, {
        method: 'OPTIONS',
        headers: {
            Origin: 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'authorization,content-type',
        },
    });

    assert.strictEqual(response.status, 204);
    assert.strictEqual(await response.text(), '');
    assert.strictEqual(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.ok(headerTokens(response, 'access-control-allow-methods').includes('post'));
    assert.ok(headerTokens(response, 'access-control-allow-headers').includes('authorization'));
    assert.ok(headerTokens(response, 'access-control-allow-headers').includes('content-type'));
    assertSecurityHeaders(response);
});

test('trailing slashes in CLIENT_ORIGIN do not break CORS', async (t) => {
    process.env.CLIENT_ORIGIN = 'https://cases.example///';
    const stand = await serve(t);
    const response = await fetch(`${stand.url}/api/module/all`, { headers: { Origin: 'https://cases.example' } });

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), normalAnswer);
    assert.strictEqual(response.headers.get('access-control-allow-origin'), 'https://cases.example');
});

for (const [name, configuredOrigin, allowedOrigin] of [
    ['default', undefined, 'http://localhost:3000'],
    ['configured', 'https://cases.example', 'https://cases.example'],
    ['normalised', 'https://cases.example///', 'https://cases.example'],
]) {
    test(`Socket.IO uses the same ${name} origin as the API`, async (t) => {
        restoreEnv('CLIENT_ORIGIN', configuredOrigin);
        const stand = await serve(t);
        chat(stand.server);
        const io = chat.getIo();
        t.after(() => new Promise((resolve) => { io.close(resolve); }));
        const response = await fetch(`${stand.url}/api/module/all`, { headers: { Origin: allowedOrigin } });
        await response.json();
        const socketResponse = await fetch(`${stand.url}/socket.io/?EIO=4&transport=polling`, {
            headers: { Origin: allowedOrigin },
        });

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.headers.get('access-control-allow-origin'), allowedOrigin);
        assert.strictEqual(io.opts.cors.origin, allowedOrigin);
        assert.strictEqual(socketResponse.status, 200);
        assert.strictEqual(socketResponse.headers.get('access-control-allow-origin'), allowedOrigin);
        assert.match(await socketResponse.text(), /^0\{"sid":/);
    });
}

test('normal API responses carry the JSON security policy and hide X-Powered-By', async (t) => {
    const stand = await serve(t);
    const response = await fetch(`${stand.url}/api/module/all`);

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), normalAnswer);
    assertSecurityHeaders(response);
});

test('a malformed JSON body keeps the CORS and security headers without a log line', async (t) => {
    const stand = await serve(t);
    const logged = catchLogs(t);
    const response = await fetch(`${stand.url}/api/profile/login`, {
        method: 'POST',
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        body: '{',
    });

    assert.strictEqual(response.status, 400);
    assert.deepStrictEqual(await response.json(), { status: 400, message: MESSAGE.SERVER.BAD_REQUEST, code: 'SERVER.BAD_REQUEST' });
    assert.strictEqual(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assertSecurityHeaders(response);
    assert.deepStrictEqual(logged, []);
});
