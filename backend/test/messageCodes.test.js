const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const MESSAGE = require('../src/constant/responseMessages');
const { messageCodes, CATALOGUE } = require('../src/middleware/messageCodes');
const { verifyLimiter } = require('../src/middleware/rateLimiters');
const answerUnhandled = require('../src/middleware/answerUnhandled');

const serve = async (mount) => {
    const app = express();
    app.use(messageCodes);
    mount(app);
    app.use(answerUnhandled);
    const server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const url = `http://127.0.0.1:${server.address().port}`;
    return {
        get: async (path) => {
            const response = await fetch(`${url}${path}`);
            return { status: response.status, body: await response.json() };
        },
        close: () => new Promise((resolve) => { server.close(resolve); }),
    };
};

test('a refusal carries the code of its text, whatever its status', async () => {
    const app = await serve((a) => {
        a.get('/refused', (req, res) => res.status(422).json({ status: 422, message: MESSAGE.PROMOCODE.EXPIRED }));
        a.get('/refused-ok', (req, res) => res.status(200).json({ status: 200, message: MESSAGE.USER.MONEY_NOT_ENOUGH }));
    });
    try {
        assert.deepStrictEqual((await app.get('/refused')).body, {
            status: 422, message: MESSAGE.PROMOCODE.EXPIRED, code: 'PROMOCODE.EXPIRED',
        });
        assert.deepStrictEqual((await app.get('/refused-ok')).body, {
            status: 200, message: MESSAGE.USER.MONEY_NOT_ENOUGH, code: 'USER.MONEY_NOT_ENOUGH',
        });
    } finally {
        await app.close();
    }
});

test('an unexpected failure answers the server error with its code', async () => {
    const app = await serve((a) => {
        a.get('/broken', () => { throw new Error('boom'); });
    });
    const originalError = console.error;
    console.error = () => {};
    try {
        const answer = await app.get('/broken');
        assert.strictEqual(answer.status, 500);
        assert.strictEqual(answer.body.code, 'SERVER.ERROR');
    } finally {
        console.error = originalError;
        await app.close();
    }
});

test('a rate-limited request carries the code of its limit text', async () => {
    const app = await serve((a) => {
        a.get('/limited', verifyLimiter, (req, res) => res.json({ ok: true }));
    });
    try {
        let answer;
        for (let attempt = 0; attempt < 100; attempt += 1) {
            answer = await app.get('/limited');
            if (answer.status === 429) {
                break;
            }
        }
        assert.deepStrictEqual(answer.body, { status: 429, message: MESSAGE.LIMIT.VERIFY, code: 'LIMIT.VERIFY' });
    } finally {
        await app.close();
    }
});

test('answers without a catalogue text, with their own code or not an object are left alone', async () => {
    const app = await serve((a) => {
        a.get('/other-text', (req, res) => res.json({ status: 200, message: 'Sended to userid 5' }));
        a.get('/own-code', (req, res) => res.json({ message: MESSAGE.PROMOCODE.EXPIRED, code: 'PROMOCODE.ADDED' }));
        a.get('/list', (req, res) => res.json([MESSAGE.PROMOCODE.EXPIRED]));
        a.get('/data', (req, res) => res.json({ data: 1 }));
    });
    try {
        assert.deepStrictEqual((await app.get('/other-text')).body, { status: 200, message: 'Sended to userid 5' });
        assert.deepStrictEqual((await app.get('/own-code')).body, { message: MESSAGE.PROMOCODE.EXPIRED, code: 'PROMOCODE.ADDED' });
        assert.deepStrictEqual((await app.get('/list')).body, [MESSAGE.PROMOCODE.EXPIRED]);
        assert.deepStrictEqual((await app.get('/data')).body, { data: 1 });
    } finally {
        await app.close();
    }
});

test('the catalogue lists every server text under its key path', () => {
    assert.ok(CATALOGUE.some(([code, text]) => code === 'PROMOCODE.EXPIRED' && text === MESSAGE.PROMOCODE.EXPIRED));
    assert.ok(CATALOGUE.some(([code, text]) => code === 'LIMIT.SELL' && text === MESSAGE.LIMIT.SELL));
    const leaves = (node) => (typeof node === 'string' ? 1 : Object.values(node).reduce((sum, child) => sum + leaves(child), 0));
    assert.strictEqual(CATALOGUE.length, leaves(MESSAGE));
});
