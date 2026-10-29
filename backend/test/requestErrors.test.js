const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

const MESSAGE = require('../src/constant/responseMessages');
const sequelize = require('../src/config/db');
const PFController = require('../src/controllers/provablyFair');
const { jsonBody, withoutPrototypeKeys } = require('../src/middleware/jsonBody');
const answerUnhandled = require('../src/middleware/answerUnhandled');

test.after(async () => {
    await sequelize.close();
});

const serve = async (mount) => {
    const app = express();
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(jsonBody);
    mount(app);
    app.use(answerUnhandled);
    const server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    return {
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((resolve) => { server.close(resolve); }),
    };
};

const withLogsCaught = async (fn) => {
    const logged = [];
    const originalError = console.error;
    console.error = (...args) => { logged.push(args.map((a) => (a instanceof Error ? a.stack : String(a))).join(' ')); };
    try {
        return { result: await fn(), logged };
    } finally {
        console.error = originalError;
    }
};

const send = async (url, raw, method = 'POST') => {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: raw });
    const text = await response.text();
    return {
        status: response.status,
        type: response.headers.get('content-type') || '',
        payload: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : text,
    };
};

test('keys that shadow what every object inherits are dropped from a JSON body, at any depth', () => {
    const parsed = JSON.parse(
        '{"a":{"toString":0,"b":1},"__proto__":{"x":1},"list":[{"valueOf":0,"c":2}],"constructor":3,"hasOwnProperty":4,"ok":"yes"}',
        withoutPrototypeKeys,
    );

    assert.deepStrictEqual(parsed, { a: { b: 1 }, list: [{ c: 2 }], ok: 'yes' });
    assert.strictEqual(Object.getPrototypeOf(parsed), Object.prototype);
    assert.strictEqual(String(parsed.a), '[object Object]');
});

test('an object hiding its toString in a body is refused by the rules instead of crashing them', async () => {
    const stand = await serve((app) => {
        app.post('/api/provably-fair/verify', PFController.validate('verify'), PFController.verify);
    });
    try {
        const bodies = [
            { serverSeed: 'a', clientSeed: 'b', nonce: { toString: 0 }, caseId: 'dust2' },
            { serverSeed: { toString: 0 }, clientSeed: 'b', nonce: 0, caseId: 'dust2' },
            { serverSeed: 'a', clientSeed: 'b', nonce: 0, openId: { valueOf: 0, toString: 0 } },
        ];
        const { result, logged } = await withLogsCaught(() => Promise.all(
            bodies.map((body) => send(`${stand.url}/api/provably-fair/verify`, JSON.stringify(body))),
        ));

        assert.deepStrictEqual(result.map(({ status, payload }) => [status, payload.message]), bodies.map(() => [422, MESSAGE.VALIDATOR.ERROR]));
        assert.deepStrictEqual(logged, []);
    } finally {
        await stand.close();
    }
});

test('a body that is not valid JSON is answered 400 as JSON with a fixed text, and nothing it holds reaches the log', async () => {
    const stand = await serve((app) => {
        app.post('/echo', (req, res) => res.json(req.body));
    });
    try {
        const { result, logged } = await withLogsCaught(() => send(`${stand.url}/echo`, '{"a":\n[auth] administrator signed in}'));

        assert.strictEqual(result.status, 400);
        assert.match(result.type, /application\/json/);
        assert.deepStrictEqual(result.payload, { status: 400, message: MESSAGE.SERVER.BAD_REQUEST });
        assert.deepStrictEqual(logged, []);
    } finally {
        await stand.close();
    }
});

test('a body over the size limit or nested too deep is refused as JSON without a log line', async () => {
    const stand = await serve((app) => {
        app.post('/echo', (req, res) => res.json({ ok: true }));
    });
    try {
        const { result, logged } = await withLogsCaught(() => Promise.all([
            send(`${stand.url}/echo`, JSON.stringify({ text: 'x'.repeat(200 * 1024) })),
            send(`${stand.url}/echo`, `${'['.repeat(20000)}${']'.repeat(20000)}`),
        ]));

        assert.deepStrictEqual(result.map(({ status, payload }) => [status, payload.message]), [
            [413, MESSAGE.SERVER.BAD_REQUEST],
            [400, MESSAGE.SERVER.BAD_REQUEST],
        ]);
        assert.deepStrictEqual(logged, []);
    } finally {
        await stand.close();
    }
});

test('an error a route passes on is answered 500 as JSON with the fixed text and logged once', async () => {
    const stand = await serve((app) => {
        app.get('/boom', (req, res, next) => next(new Error('lost the database')));
    });
    try {
        const { result, logged } = await withLogsCaught(() => send(`${stand.url}/boom`, undefined, 'GET'));

        assert.strictEqual(result.status, 500);
        assert.deepStrictEqual(result.payload, { status: 500, message: MESSAGE.SERVER.ERROR });
        assert.strictEqual(logged.length, 1);
        assert.match(logged[0], /lost the database/);
    } finally {
        await stand.close();
    }
});

test('an error that comes after the answer has started is left to Express', () => {
    const failure = new Error('late');
    const passedOn = [];

    answerUnhandled(failure, {}, { headersSent: true }, (err) => passedOn.push(err));

    assert.deepStrictEqual(passedOn, [failure]);
});

test('server.js parses JSON through jsonBody before the routes and answers what they leave through answerUnhandled after them', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const at = (snippet) => {
        const index = source.indexOf(snippet);
        assert.notStrictEqual(index, -1, `server.js has no ${snippet}`);
        return index;
    };

    assert.doesNotMatch(source, /bodyParser\.json\(/);
    assert.ok(at('app.use(jsonBody)') < at('routes(app)'));
    assert.ok(at('routes(app)') < at('app.use(answerUnhandled)'));
});
