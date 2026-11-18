const { resetTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { startChatServer, connectClient, settle } = require('./helpers/socketClient');
const ROLES = require('../src/constant/enums/roles');

let sequelize;
let controller;
let manager;
let raw;
let chat;
let ChatService;
const clients = [];

const call = (name, ...args) => new Promise((resolve, reject) => {
    raw[name](...args, (e, result) => (e ? reject(e) : resolve(result)));
});

const invoke = async (method, id, body = {}, adminId = 1) => {
    const req = { params: { id: String(id) }, body, user: { profile: { user_id: adminId } } };
    await Promise.all(controller.validate(method).map((rule) => rule.run(req)));
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { return { code: this.statusCode, payload }; },
    };
    return controller[method](req, res);
};

const journal = async () => (await sequelize.query('SELECT * FROM admin_actions ORDER BY id'))[0];
const player = async () => (await sequelize.query('SELECT role, mutedUntil FROM users WHERE id = 2'))[0][0];

const HAS_REDIS = Boolean(process.env.CI || process.env.REDIS_PORT);
const needsRedis = { skip: !HAS_REDIS && 'needs a Redis: set REDIS_PORT (CI uses its service on 6379)' };
const redisTest = (name, fn) => test(name, async (t) => {
    if (needsRedis.skip) return t.skip(needsRedis.skip);
    return fn(t);
});

const rawReady = async () => {
    let timer;
    const abort = new AbortController();
    const ready = once(raw, 'ready', { signal: abort.signal });
    const timeout = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Redis ready wait timed out after 2000 ms')), 2000);
    });
    try {
        await Promise.race([ready, timeout]);
    } finally {
        clearTimeout(timer);
        abort.abort();
    }
};

const managerReady = async () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
            await manager.ping();
            return;
        } catch (e) {
            await new Promise((resolve) => { setTimeout(resolve, 100); });
        }
    }
    await manager.ping();
};

test.before(async () => {
    sequelize = await resetTestDatabase();
    controller = require('../src/controllers/admin/chat');
    manager = require('../src/redis/manager');
    ChatService = require('../src/services/chat');
    chat = require('../src/socket/chat');
    if (!HAS_REDIS) {
        return;
    }
    raw = require('redis').createClient(Number(process.env.REDIS_PORT) || 6379, process.env.REDIS_HOST || '127.0.0.1', {
        ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
        connect_timeout: 2000,
        enable_offline_queue: false,
        retry_strategy: () => undefined,
    });
    raw.on('error', () => {});
    try {
        if (!raw.ready) await rawReady();
    } catch (e) {
        needsRedis.skip = `Redis unavailable: ${e.message}`;
        raw.end(true);
        raw = null;
        return;
    }
    if (!process.env.CI && await call('exists', 'chat_messages', 'chat_hash')) {
        needsRedis.skip = 'Refusing to use Redis with existing chat keys outside CI; start an isolated Redis';
        raw.end(true);
        raw = null;
        return;
    }
    await managerReady();
});

test.beforeEach(async () => {
    await sequelize.query('DELETE FROM admin_actions');
    await sequelize.query('DELETE FROM users');
    await sequelize.query("INSERT INTO users (id, login, password, email, role) VALUES (1, 'boss', 'x', 'boss@e.ua', 10), (2, 'player', 'x', 'player@e.ua', 1), (3, 'peer', 'x', 'peer@e.ua', 10)");
    if (raw) {
        await call('del', 'chat_messages', 'chat_hash');
    }
});

test.afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.close()));
    if (chat && chat.getIo()) await new Promise((resolve) => chat.getIo().close(resolve));
});

test.after(async () => {
    if (raw) {
        await call('del', 'chat_messages', 'chat_hash');
        raw.end(true);
    }
    if (manager) await manager.quit();
    if (sequelize) await sequelize.close();
});

test('a temporary mute and lift keep the role and journal before/after and a trimmed reason', async () => {
    const before = Date.now();
    const muted = await invoke('mute', 2, { durationMinutes: 15, reason: '  spam  ' });
    assert.equal(muted.code, 200);
    const until = new Date(muted.payload.mutedUntil).getTime();
    assert.ok(until >= before + 899000 && until <= Date.now() + 900000);
    assert.equal(Number((await player()).role), ROLES.NORMAL);
    assert.equal(new Date((await player()).mutedUntil).getTime(), until);
    const first = (await journal())[0];
    assert.equal(first.action, 'user.mute');
    assert.equal(first.targetId, '2');
    assert.equal(first.reason, 'spam');
    assert.deepEqual(JSON.parse(first.payload), { before: null, after: muted.payload.mutedUntil });
    const lifted = await invoke('unmute', 2, { reason: 'appeal accepted' });
    assert.equal(lifted.code, 200);
    assert.equal((await player()).mutedUntil, null);
    assert.equal((await journal())[1].action, 'user.unmute');
});

test('the migration adds a nullable DATETIME and can be reversed and applied again', async () => {
    const migration = require('../migrations/20261118000100-chat-mute');
    const context = sequelize.getQueryInterface();
    const columns = await context.describeTable('users');
    assert.match(columns.mutedUntil.type, /DATETIME/);
    assert.equal(columns.mutedUntil.allowNull, true);
    await migration.down({ context });
    assert.equal((await context.describeTable('users')).mutedUntil, undefined);
    await migration.up({ context });
    assert.equal((await player()).mutedUntil, null);
});

test('private session and admin list include the mute deadline while public profiles keep it private', async () => {
    const until = '2099-01-01T00:00:00.000Z';
    await sequelize.query("UPDATE users SET mutedUntil = '2099-01-01' WHERE id = 2");
    const session = await require('../src/auth/token').sessionUser(2, 0);
    assert.equal(session.user_mutedUntil.toISOString(), until);
    const users = require('../src/services/user');
    const list = await users.getUsersPaged();
    assert.equal(list.rows.find((u) => u.user_id === 2).user_mutedUntil.toISOString(), until);
    const publicUser = await users.findUserById(2);
    assert.equal(publicUser.dataValues.user_mutedUntil, undefined);
});

test('invalid durations, reasons and ids never change a player or create a journal row', async () => {
    const bodies = [
        {}, { durationMinutes: 0, reason: 'spam' }, { durationMinutes: 43201, reason: 'spam' },
        { durationMinutes: 1.5, reason: 'spam' }, { durationMinutes: [15, 20], reason: 'spam' },
        { durationMinutes: 15, reason: ['spam'] }, { durationMinutes: 15, reason: '   ' },
        { durationMinutes: 15, reason: `a${'\uFE0F'.repeat(255)}` },
    ];
    for (const body of bodies) assert.equal((await invoke('mute', 2, body)).code, 422);
    for (const id of ['2x', '2147483648', ['2', '3']]) {
        assert.equal((await invoke('mute', id, { durationMinutes: 15, reason: 'spam' })).code, 422);
    }
    assert.equal((await invoke('unmute', 2, { reason: ' ' })).code, 422);
    assert.equal((await player()).mutedUntil, null);
    assert.equal((await journal()).length, 0);
});

test('mute and lift refuse yourself and a missing player, and mute refuses another administrator', async () => {
    for (const method of ['mute', 'unmute']) {
        for (const id of [1, 999]) {
            assert.equal((await invoke(method, id, { durationMinutes: 15, reason: 'spam' })).code, 422);
        }
    }
    assert.equal((await invoke('mute', 3, { durationMinutes: 15, reason: 'spam' })).code, 422);
    assert.equal((await journal()).length, 0);
});

test('a player promoted while muted can be unmuted with a journal entry and keeps the administrator role', async () => {
    const muted = await invoke('mute', 2, { durationMinutes: 15, reason: 'spam' });
    assert.equal(muted.code, 200);
    await sequelize.query('UPDATE users SET role = 10 WHERE id = 2');
    assert.equal((await invoke('mute', 2, { durationMinutes: 30, reason: 'again' })).code, 422);
    const lifted = await invoke('unmute', 2, { reason: '  promoted  ' });
    assert.equal(lifted.code, 200);
    assert.equal(lifted.payload.mutedUntil, null);
    assert.equal((await player()).mutedUntil, null);
    assert.equal(Number((await player()).role), ROLES.ADMINISTRATOR);
    const rows = await journal();
    assert.equal(rows.length, 2);
    assert.equal(rows[1].action, 'user.unmute');
    assert.equal(rows[1].reason, 'promoted');
    assert.deepEqual(JSON.parse(rows[1].payload), { before: muted.payload.mutedUntil, after: null });
});

test('an audit failure rolls back the mute and lift, and unexpected errors stay private', async (t) => {
    const actions = require('../src/services/adminAction');
    const original = actions.record;
    const errors = [];
    t.mock.method(console, 'error', (...args) => errors.push(args));
    actions.record = async () => { throw new Error('private SQL failure'); };
    try {
        assert.equal((await invoke('mute', 2, { durationMinutes: 15, reason: 'spam' })).code, 500);
        assert.equal((await player()).mutedUntil, null);
        await sequelize.query("UPDATE users SET mutedUntil = '2099-01-01' WHERE id = 2");
        const result = await invoke('unmute', 2, { reason: 'appeal' });
        assert.equal(result.code, 500);
        assert.ok(!JSON.stringify(result).includes('private SQL'));
        assert.ok((await player()).mutedUntil);
        assert.equal(errors.length, 2);
    } finally {
        actions.record = original;
    }
});

test('concurrent mutes journal the actual locked previous value', async () => {
    const results = await Promise.all([15, 30, 60].map((durationMinutes) => invoke('mute', 2, { durationMinutes, reason: 'spam' })));
    assert.ok(results.every((r) => r.code === 200));
    const entries = (await journal()).map((row) => JSON.parse(row.payload));
    assert.equal(entries[0].before, null);
    assert.equal(entries[1].before, entries[0].after);
    assert.equal(entries[2].before, entries[1].after);
    assert.equal(new Date((await player()).mutedUntil).toISOString(), entries[2].after);
});

const connect = async (port, userId) => {
    const { signToken } = require('../src/auth/token');
    const client = await connectClient(port, userId ? signToken({ user_id: userId }) : null);
    clients.push(client);
    return client;
};

redisTest('real sockets refuse a fresh mute with remaining time, notify only its player and resume after lifting', async () => {
    const { port } = await startChatServer(chat);
    const sender = await connect(port, 2);
    const secondTab = await connect(port, 2);
    const observer = await connect(port, null);
    const result = await invoke('mute', 2, { durationMinutes: 15, reason: 'spam' });
    const state = await sender.waitFor('chat mute');
    assert.equal(state.mutedUntil, result.payload.mutedUntil);
    await secondTab.waitFor('chat mute');
    const refusal = await sender.request('chat message', { msg: 'blocked' });
    assert.equal(refusal.ok, false);
    assert.equal(refusal.reason, 'muted');
    assert.equal(refusal.mutedUntil, result.payload.mutedUntil);
    assert.ok(refusal.remainingSeconds > 0 && refusal.remainingSeconds <= 900);
    await settle();
    assert.deepEqual(observer.events('chat message'), []);
    assert.deepEqual(observer.events('chat mute'), []);
    assert.deepEqual(await ChatService.get(), []);
    await invoke('unmute', 2, { reason: 'appeal' });
    await sender.waitFor('chat mute', (value) => value.mutedUntil === null);
    const accepted = await sender.request('chat message', { msg: 'allowed' });
    assert.equal(accepted.ok, true);
    assert.ok(accepted.message.messageId);
    const seen = await observer.waitFor('chat message');
    assert.equal(seen.messageId, accepted.message.messageId);
    assert.equal((await ChatService.get())[0].messageId, seen.messageId);
    await sequelize.query('UPDATE users SET role = -2 WHERE id = 2');
    assert.equal((await sender.request('chat message', { msg: 'permanent' })).reason, 'banned');
});

redisTest('opening the chat refreshes a mute missed while it was hidden, using the current session', async () => {
    await invoke('mute', 2, { durationMinutes: 15, reason: 'spam' });
    const { port } = await startChatServer(chat);
    const sender = await connect(port, 2);
    sender.emit('user connected');
    const state = await sender.waitFor('chat mute');
    assert.ok(new Date(state.mutedUntil).getTime() > Date.now());
    assert.ok(Math.abs(new Date(state.serverNow).getTime() - Date.now()) < 3000);
    assert.equal(sender.events('chat messages').length, 1);
});

redisTest('new stored messages have stable distinct ids while legacy messages stay readable', async () => {
    await call('rpush', 'chat_messages', JSON.stringify({ id: 2, login: 'old', msg: 'legacy', time: 1 }));
    const supplied = { messageId: randomUUID(), id: 2, login: 'player', msg: 'kept', time: 2 };
    await ChatService.add(supplied);
    await ChatService.add({ id: 2, login: 'player', msg: 'new', time: 3 });
    const messages = await ChatService.get();
    assert.equal(messages[0].messageId, undefined);
    assert.equal(messages[1].messageId, supplied.messageId);
    assert.match(messages[2].messageId, /^[a-f0-9-]{36}$/);
    assert.notEqual(messages[2].messageId, supplied.messageId);
    assert.deepEqual(await ChatService.get(), messages);
});

redisTest('real sockets refuse unpaired surrogates without storing or broadcasting them', async () => {
    const { port } = await startChatServer(chat);
    const sender = await connect(port, 2);
    const guest = await connect(port, null);
    assert.deepEqual(await sender.request('chat message', { msg: '\ud800' }), { ok: false, reason: 'empty' });
    await settle();
    assert.deepEqual(await ChatService.get(), []);
    assert.deepEqual(guest.events('chat message'), []);
    assert.equal((await sender.request('chat message', { msg: '\ud83d\ude00' })).ok, true);
});

redisTest('removal handles stored unpaired surrogates and cannot match an id quoted in another message', async () => {
    for (const msg of ['\ud800', '\udfff', 'before\ud800after']) {
        const messageId = randomUUID();
        const keep = { messageId: randomUUID(), id: 2, login: 'player', msg: `"messageId":"${messageId}"`, time: 1 };
        const target = { messageId, id: 2, login: 'player', msg, time: 2 };
        await call('rpush', 'chat_messages', JSON.stringify(keep), JSON.stringify(target));
        assert.equal((await invoke('removeMessage', messageId)).code, 200);
        const stored = await call('lrange', 'chat_messages', 0, -1);
        assert.ok(stored.includes(JSON.stringify(keep)));
        assert.ok(!stored.includes(JSON.stringify(target)));
    }
    assert.equal((await journal()).length, 3);
});

redisTest('removal is broadcast to author, administrator and guest and journals only author and a short excerpt', async () => {
    const { port } = await startChatServer(chat);
    const sender = await connect(port, 2);
    const admin = await connect(port, 1);
    const guest = await connect(port, null);
    const text = 'sensitive '.repeat(45);
    const sent = await sender.request('chat message', { msg: text });
    assert.equal(sent.ok, true);
    const { messageId } = sent.message;
    const result = await invoke('removeMessage', messageId);
    assert.equal(result.code, 200);
    for (const client of [sender, admin, guest]) {
        assert.deepEqual(await client.waitFor('chat message removed'), { messageId });
    }
    assert.deepEqual(await ChatService.get(), []);
    const rows = await journal();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].action, 'chat.remove');
    const payload = JSON.parse(rows[0].payload);
    assert.equal(payload.authorId, 2);
    assert.equal(payload.authorLogin, 'player');
    assert.ok(payload.excerpt.length <= 83);
    assert.ok(!rows[0].payload.includes(text));
    assert.equal((await invoke('removeMessage', messageId)).code, 422);
    assert.equal((await journal()).length, 1);
    assert.equal((await invoke('removeMessage', '2')).code, 422);
});

redisTest('atomic removal preserves concurrent appends and legacy entries and only one concurrent delete succeeds', async (t) => {
    const keep = { id: 2, login: 'old', msg: 'legacy', time: 1 };
    await call('rpush', 'chat_messages', JSON.stringify(keep), '{broken');
    const target = { messageId: randomUUID(), id: 2, login: 'player', msg: 'remove', time: 2 };
    await ChatService.add(target);
    const redis = require('redis');
    const commands = [];
    const send = redis.RedisClient.prototype.internal_send_command;
    const removing = new (require('node:async_hooks').AsyncLocalStorage)();
    const remove = ChatService.remove;
    t.mock.method(ChatService, 'remove', (id) => removing.run(true, () => remove(id)));
    t.mock.method(redis.RedisClient.prototype, 'internal_send_command', function (command) {
        if (removing.getStore() && command.args.includes('chat_messages')) commands.push(command.command);
        return send.call(this, command);
    });
    const results = await Promise.all([
        invoke('removeMessage', target.messageId), invoke('removeMessage', target.messageId),
        ...Array.from({ length: 30 }, (_, n) => ChatService.add({ id: 2, msg: `live${n}`, time: n + 3 })),
    ]);
    assert.deepEqual(results.slice(0, 2).map((r) => r.code).sort(), [200, 422]);
    const all = (await call('lrange', 'chat_messages', 0, -1)).filter((r) => r !== '{broken').map(JSON.parse);
    assert.equal(all.length, 31);
    assert.deepEqual(all[0], keep);
    assert.equal(all.some((m) => m.messageId === target.messageId), false);
    assert.equal((await journal()).length, 1);
    assert.deepEqual(commands, ['eval', 'eval'], 'each removal must be one server-side script, with no client-side read/write gap');
});

redisTest('failed journalling leaves the message in Redis and emits no removal', async (t) => {
    const { port } = await startChatServer(chat);
    const guest = await connect(port, null);
    await ChatService.add({ messageId: randomUUID(), id: 2, login: 'player', msg: 'kept', time: 1 });
    const [message] = await ChatService.get();
    t.mock.method(require('../src/services/adminAction'), 'record', async () => { throw new Error('private audit failure'); });
    t.mock.method(console, 'error', () => {});
    assert.equal((await invoke('removeMessage', message.messageId)).code, 500);
    assert.deepEqual(await ChatService.get(), [message]);
    await settle();
    assert.deepEqual(guest.events('chat message removed'), []);
});

redisTest('even a short message is excerpted rather than copied in full into the journal', async () => {
    const messageId = randomUUID();
    await ChatService.add({ messageId, id: 2, login: 'player', msg: 'short text', time: 1 });
    assert.equal((await invoke('removeMessage', messageId)).code, 200);
    const payload = JSON.parse((await journal())[0].payload);
    assert.notEqual(payload.excerpt, 'short text');
    assert.ok(!payload.excerpt.includes('short text'));
});

redisTest('a message trimmed during moderation creates no false deletion journal and keeps the capped new history', async (t) => {
    const messageId = randomUUID();
    await ChatService.add({ messageId, id: 2, login: 'player', msg: 'old', time: 1 });
    const remove = ChatService.remove;
    t.mock.method(ChatService, 'remove', async (id) => {
        await Promise.all(Array.from({ length: 501 }, (_, n) => ChatService.add({ id: 2, msg: `new${n}`, time: n + 2 })));
        return remove(id);
    });
    assert.equal((await invoke('removeMessage', messageId)).code, 422);
    assert.equal((await journal()).length, 0);
    assert.equal(Number(await call('llen', 'chat_messages')), 500);
    assert.equal((await ChatService.get()).at(-1).msg, 'new500');
});

const fixtureSandbox = ({ keys = [], ci = false, ready = true } = {}) => {
    const { EventEmitter } = require('node:events');
    const client = new EventEmitter();
    const operations = [];
    const hooks = {};
    const timers = new Map();
    let options;
    client.ready = ready;
    client.end = () => operations.push('end');
    client.exists = (...args) => { const callback = args.pop(); callback(null, args.filter((key) => keys.includes(key)).length); };
    client.del = (...args) => { operations.push(args.slice(0, -1)); args.pop()(null, 1); };
    const fakeTest = () => {};
    for (const hook of ['before', 'beforeEach', 'after', 'afterEach']) fakeTest[hook] = (fn) => { hooks[hook] = fn; };
    const dependencies = {
        './helpers/db': { resetTestDatabase: async () => ({ query: async () => {}, close: async () => {} }) },
        'node:test': fakeTest,
        '../src/controllers/admin/chat': {},
        '../src/redis/manager': { ping: async () => {}, quit: async () => {} },
        '../src/services/chat': {},
        '../src/socket/chat': { getIo: () => null },
        redis: { createClient: (...args) => { options = args[2]; return client; } },
    };
    const vm = require('node:vm');
    const context = vm.createContext({
        require: (name) => (Object.hasOwn(dependencies, name) ? dependencies[name] : require(name)),
        process: { env: { REDIS_PORT: '12345', REDIS_PASSWORD: 'fixture-password', ...(ci ? { CI: 'true' } : {}) } },
        AbortController,
        setTimeout: (fn, ms) => { const id = {}; timers.set(id, { fn, ms }); return id; },
        clearTimeout: (id) => timers.delete(id),
    });
    vm.runInContext(require('node:fs').readFileSync(__filename, 'utf8'), context, { filename: __filename });
    const skip = () => vm.runInContext('needsRedis.skip', context);
    return { client, operations, hooks, timers, skip, options: () => options };
};

for (const key of ['chat_messages', 'chat_hash']) {
    test(`the Redis fixture skips without deleting pre-existing ${key} outside CI`, async () => {
        const fixture = fixtureSandbox({ keys: [key] });
        await fixture.hooks.before();
        await fixture.hooks.beforeEach();
        await fixture.hooks.after();
        assert.match(fixture.skip(), /refus.*existing.*chat/i);
        assert.equal(fixture.operations.some(Array.isArray), false, 'unowned Redis keys must never be deleted');
    });
}

test('the Redis fixture can clear keys it owns on an initially empty Redis', async () => {
    const fixture = fixtureSandbox();
    await fixture.hooks.before();
    await fixture.hooks.beforeEach();
    await fixture.hooks.after();
    assert.equal(fixture.skip(), false);
    assert.equal(fixture.operations.filter(Array.isArray).length, 2);
});

test('the Redis fixture allows the isolated CI service to be reused', async () => {
    const fixture = fixtureSandbox({ keys: ['chat_messages'], ci: true });
    await fixture.hooks.before();
    await fixture.hooks.beforeEach();
    await fixture.hooks.after();
    assert.equal(fixture.skip(), false);
    assert.equal(fixture.operations.filter(Array.isArray).length, 2);
});

test('the Redis fixture authenticates its raw client with REDIS_PASSWORD', async () => {
    const fixture = fixtureSandbox();
    await fixture.hooks.before();
    await fixture.hooks.after();
    assert.equal(fixture.options().password, 'fixture-password');
});

test('the Redis fixture bounds the ready wait and closes an unready client without deleting keys', async () => {
    const fixture = fixtureSandbox({ ready: false });
    const starting = fixture.hooks.before();
    await new Promise((resolve) => setImmediate(resolve));
    const deadline = [...fixture.timers.values()].find(({ ms }) => ms > 0 && ms <= 5000);
    if (!deadline) fixture.client.emit('ready');
    else deadline.fn();
    await starting;
    await fixture.hooks.beforeEach();
    await fixture.hooks.after();
    assert.ok(deadline, 'the ready wait needs a timeout of at most five seconds');
    assert.match(fixture.skip(), /Redis.*ready.*timed out/i);
    assert.equal(fixture.operations.some(Array.isArray), false);
    assert.ok(fixture.operations.includes('end'));
    assert.equal(fixture.client.listenerCount('ready'), 0);
    assert.equal(fixture.timers.size, 0);
});
