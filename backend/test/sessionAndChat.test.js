const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const stub = (relative, exports) => {
    const resolved = require.resolve(relative);
    require.cache[resolved] = {
        id: resolved, filename: resolved, loaded: true, exports,
    };
};

test('a database failure while checking a token answers 503 and does not leak the error', async () => {
    stub('../src/auth/token', {
        sessionUser: async () => { throw new Error('SequelizeConnectionRefusedError: connect ECONNREFUSED 127.0.0.1:3306'); },
    });
    const { authenticate } = require('../src/middleware/authenticate');
    const jwtOptions = require('../src/auth/jwtConfig');
    const token = jwt.sign({ id: 1, ver: 0 }, jwtOptions.secretOrKey, jwtOptions.signOptions);

    const result = await new Promise((resolve) => {
        const req = { headers: { authorization: `Bearer ${token}` }, method: 'GET', url: '/api/profile/get' };
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(payload) { resolve({ code: this.statusCode, payload }); },
        };
        authenticate(req, res, () => resolve({ code: 'next' }));
    });

    assert.strictEqual(result.code, 503, 'an outage must not read as a revoked session');
    assert.ok(!JSON.stringify(result.payload).includes('ECONNREFUSED'), JSON.stringify(result.payload));
});

test('a socket asking for the chat state gets it alone, not every connected client', async () => {
    stub('../src/services/chat', { get: async () => [{ login: 'a', msg: 'hi' }] });
    stub('../src/auth/token', { userFromToken: async () => null, sessionUser: async () => null, tokenVersionOf: () => 0 });
    const { onUserConnected } = require('../src/socket/chat');

    const sent = [];
    const socket = { emit: (event, payload) => sent.push([event, payload]) };
    await onUserConnected(socket, new Map([['player', ['c', 's']]]))();

    assert.deepStrictEqual(sent, [
        ['user-on', ['player']],
        ['chat messages', [{ login: 'a', msg: 'hi' }]],
    ]);
});
