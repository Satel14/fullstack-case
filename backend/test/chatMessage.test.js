const test = require('node:test');
const assert = require('node:assert');
const ROLES = require('../src/constant/enums/roles');
const { postChatMessage } = require('../src/socket/chatMessage');

const player = (role) => ({
    user_id: 7,
    user_login: 'player',
    user_avatar: 'a.png',
    user_role: role,
});

const setup = (user) => {
    const saved = [];
    const deps = {
        findUser: async () => user,
        saveMessage: async (message) => { saved.push(message); },
        now: () => 1700000000000,
    };
    return { saved, deps };
};

test('a normal player posts and the message is stored', async () => {
    const { saved, deps } = setup(player(ROLES.NORMAL));

    const result = await postChatMessage({ id: 7 }, 'hello', deps);

    assert.strictEqual(result.ok, true);
    const { messageId, ...message } = result.message;
    assert.match(messageId, /^[a-f0-9-]{36}$/);
    assert.deepStrictEqual(message, {
        login: 'player', msg: 'hello', id: 7, avatar: 'a.png', time: 1700000000,
    });
    assert.deepStrictEqual(saved, [result.message]);
});

test('chat-banned and banned players are refused and nothing is stored', async () => {
    for (const role of [ROLES.BANNED_CHAT, ROLES.BANNED, String(ROLES.BANNED_CHAT)]) {
        const { saved, deps } = setup(player(role));

        const result = await postChatMessage({ id: 7 }, 'hello', deps);

        assert.deepStrictEqual(result, { ok: false, reason: 'banned' }, `role ${role}`);
        assert.strictEqual(saved.length, 0, `role ${role}`);
    }
});

test('the role is read fresh, so a ban issued after the socket connected still applies', async () => {
    const { saved, deps } = setup(player(ROLES.BANNED_CHAT));

    const result = await postChatMessage({ id: 7, role: ROLES.NORMAL }, 'hello', deps);

    assert.strictEqual(result.reason, 'banned');
    assert.strictEqual(saved.length, 0);
});

test('an unauthenticated socket is refused without a lookup', async () => {
    let looked = false;
    const { saved, deps } = setup(player(ROLES.NORMAL));
    deps.findUser = async () => { looked = true; return player(ROLES.NORMAL); };

    const result = await postChatMessage(null, 'hello', deps);

    assert.deepStrictEqual(result, { ok: false, reason: 'unauthorized' });
    assert.strictEqual(looked, false);
    assert.strictEqual(saved.length, 0);
});

test('an empty or whitespace message is refused', async () => {
    for (const msg of ['', '   ', undefined, null]) {
        const { saved, deps } = setup(player(ROLES.NORMAL));

        const result = await postChatMessage({ id: 7 }, msg, deps);

        assert.deepStrictEqual(result, { ok: false, reason: 'empty' }, `msg ${JSON.stringify(msg)}`);
        assert.strictEqual(saved.length, 0);
    }
});

test('only a string message within the length limit is accepted', async () => {
    const { MAX_MESSAGE_LENGTH } = require('../src/socket/chatMessage');
    for (const msg of [['a', 'b', 'c'], { text: 'hi' }, 12345, true, 'x'.repeat(MAX_MESSAGE_LENGTH + 1)]) {
        const { saved, deps } = setup(player(ROLES.NORMAL));

        const result = await postChatMessage({ id: 7 }, msg, deps);

        assert.strictEqual(result.ok, false, `msg ${JSON.stringify(msg).slice(0, 40)}`);
        assert.strictEqual(saved.length, 0);
    }

    const { saved, deps } = setup(player(ROLES.NORMAL));
    const longest = await postChatMessage({ id: 7 }, 'x'.repeat(MAX_MESSAGE_LENGTH), deps);
    assert.strictEqual(longest.ok, true);
    assert.strictEqual(saved.length, 1);
});

test('temporary mutes refuse with the deadline and seconds remaining, then expire at the deadline', async () => {
    const { saved, deps } = setup({ ...player(ROLES.NORMAL), user_mutedUntil: new Date(1700000060000) });
    const result = await postChatMessage({ id: 7 }, 'blocked', deps);
    assert.deepStrictEqual(result, {
        ok: false, reason: 'muted', mutedUntil: '2023-11-14T22:14:20.000Z', remainingSeconds: 60,
    });
    assert.strictEqual(saved.length, 0);
    deps.now = () => 1700000060000;
    assert.strictEqual((await postChatMessage({ id: 7 }, 'allowed', deps)).ok, true);
});

test('unpaired UTF-16 surrogates are refused before looking up or storing a message', async () => {
    for (const msg of ['\ud800', '\udfff', 'before\ud800after', '\ud800\ud800', '\udfff\ud800']) {
        const { saved, deps } = setup(player(ROLES.NORMAL));
        deps.findUser = async () => { assert.fail('invalid text must be refused before a session lookup'); };
        assert.deepStrictEqual(await postChatMessage({ id: 7 }, msg, deps), { ok: false, reason: 'empty' });
        assert.strictEqual(saved.length, 0);
    }
});

test('well-formed surrogate pairs and replacement characters remain valid chat text', async () => {
    for (const msg of ['hello \ud83d\ude00', '\ud800\udc00', '\ufffd']) {
        const { saved, deps } = setup(player(ROLES.NORMAL));
        const result = await postChatMessage({ id: 7 }, msg, deps);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(saved[0].msg, msg);
    }
});
