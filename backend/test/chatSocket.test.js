const test = require('node:test');
const assert = require('node:assert');
const { startChatServer, connectClient, settle } = require('./helpers/socketClient');

const stub = (relative, exports) => {
    const resolved = require.resolve(relative);
    require.cache[resolved] = {
        id: resolved, filename: resolved, loaded: true, exports,
    };
};

const PLAYERS = {
    alice: { user_id: 1, user_login: 'alice', user_avatar: 'a.png', user_role: 1 },
    bob: { user_id: 2, user_login: 'bob', user_avatar: 'b.png', user_role: 1 },
};

const chatStore = { added: [], reads: 0 };

stub('../src/services/chat', {
    add: async (message) => { chatStore.added.push(message); },
    get: async () => {
        chatStore.reads += 1;
        return [{ login: 'alice', msg: 'history', id: 1, time: 1 }];
    },
});
stub('../src/auth/token', {
    userFromToken: async (token) => PLAYERS[token] || null,
    sessionUser: async (id) => Object.values(PLAYERS).find((p) => p.user_id === id) || null,
    tokenVersionOf: () => 0,
});

const chat = require('../src/socket/chat');

let current = null;
const clients = [];

const start = async () => {
    chatStore.added = [];
    chatStore.reads = 0;
    const { port } = await startChatServer(chat);
    current = { io: chat.getIo(), port };
    return port;
};

const join = async (token) => {
    const client = await connectClient(current.port, token);
    clients.push(client);
    return client;
};

test.afterEach(async () => {
    await Promise.all(clients.splice(0).map((c) => c.close()));
    if (current) {
        await new Promise((resolve) => current.io.close(() => resolve()));
        current = null;
    }
});

test('one account flooding the chat is throttled per player, and everyone else only sees its burst', async () => {
    await start();
    const attacker = await join('alice');
    const observer = await join(null);

    const replies = await Promise.all(
        Array.from({ length: 20 }, (_, i) => attacker.request('chat message', { msg: `spam ${i}` })),
    );
    const accepted = replies.filter((r) => r.ok).length;

    assert.ok(accepted >= 1 && accepted <= 5, `${accepted} of 20 messages got through`);
    assert.ok(
        replies.filter((r) => !r.ok).every((r) => r.reason === 'tooFast'),
        JSON.stringify(replies.filter((r) => !r.ok)),
    );
    assert.strictEqual(chatStore.added.length, accepted);

    const secondTab = await join('alice');
    const fromSecondTab = await secondTab.request('chat message', { msg: 'from another tab' });
    assert.deepStrictEqual(fromSecondTab, { ok: false, reason: 'tooFast' }, 'a second tab must not get a fresh burst');

    const bob = await join('bob');
    assert.strictEqual((await bob.request('chat message', { msg: 'hello' })).ok, true, 'other players are not throttled');

    await settle();
    assert.strictEqual(observer.events('chat message').length, accepted + 1);

    await settle(1100);
    assert.strictEqual((await attacker.request('chat message', { msg: 'later' })).ok, true, 'the allowance refills');
});
