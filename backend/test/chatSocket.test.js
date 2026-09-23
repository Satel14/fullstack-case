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

test("repeating 'new-user' on one socket announces the player once", async () => {
    await start();
    const observer = await join(null);
    const player = await join('alice');

    for (let i = 0; i < 20; i += 1) {
        player.emit('new-user', 'alice');
    }
    await observer.waitFor('user-on', (list) => list.includes('alice'));
    await settle(1300);

    assert.strictEqual(observer.events('user-on').length, 1, JSON.stringify(observer.events('user-on')));
});

test('an anonymous visitor leaving does not rebroadcast the chat roster', async () => {
    await start();
    const observer = await join(null);
    const visitor = await join(null);

    await visitor.close();
    await settle(300);

    assert.deepStrictEqual(observer.events('user-on'), []);
});

test('a player with two tabs stays in the roster until the last tab closes', async () => {
    await start();
    const observer = await join(null);
    const firstTab = await join('alice');
    const secondTab = await join('alice');
    firstTab.emit('new-user', 'alice');
    secondTab.emit('new-user', 'alice');
    await observer.waitFor('user-on', (list) => list.includes('alice'));

    await secondTab.close();
    await settle(1300);
    const afterOneTab = observer.events('user-on');
    assert.deepStrictEqual(afterOneTab[afterOneTab.length - 1], ['alice']);

    await firstTab.close();
    await observer.waitFor('user-on', (list) => list.length === 0);
});

test("a burst of 'user connected' reads the history at most once per second, and the last request is still answered", async () => {
    await start();
    const observer = await join(null);
    const visitor = await join(null);

    for (let i = 0; i < 50; i += 1) {
        visitor.emit('user connected');
    }
    await settle(1300);

    assert.ok(chatStore.reads >= 1 && chatStore.reads <= 2, `the history was read ${chatStore.reads} times`);
    const answered = visitor.events('chat messages').length;
    assert.ok(answered >= 1 && answered <= 2, `answered ${answered} times`);
    assert.deepStrictEqual(observer.events('chat messages'), [], 'the history goes to the asking socket alone');

    visitor.emit('user connected');
    await visitor.waitFor('chat messages', () => visitor.events('chat messages').length > answered, 1500);
});
