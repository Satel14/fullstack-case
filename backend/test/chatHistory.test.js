const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createFakeRedis } = require('./helpers/fakeRedis');

const redisPath = require.resolve('redis');
const managerPath = require.resolve('../src/redis/manager');
const chatPath = require.resolve('../src/services/chat');

const freshChat = () => {
    const fake = createFakeRedis();
    require.cache[redisPath] = {
        id: redisPath, filename: redisPath, loaded: true, exports: { createClient: () => fake.client },
    };
    delete require.cache[managerPath];
    delete require.cache[chatPath];
    return { fake, ChatService: require('../src/services/chat') };
};

const message = (n, perSecond = 1) => ({
    login: 'player', msg: `m${n}`, id: 7, avatar: 'a.png', time: 1700000000 + Math.floor(n / perSecond),
});

const storedMessages = (fake) => [...fake.store.keys()].reduce((sum, key) => sum + fake.entriesAt(key), 0);

const legacyHash = (fake, numbers) => {
    const hash = new Map();
    numbers.forEach((n) => hash.set(`uuid-${n}`, JSON.stringify(message(n))));
    fake.store.set('chat_hash', hash);
    return hash;
};

const shuffled = (length) => {
    const numbers = Array.from({ length }, (_, i) => i);
    for (let i = numbers.length - 1; i > 0; i -= 1) {
        const j = (i * 7919) % (i + 1);
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers;
};

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => `m${from + i}`);

test('the chat history is capped, and a read fetches only the 26 newest messages in order', async () => {
    const { fake, ChatService } = freshChat();

    for (let n = 0; n < 600; n += 1) {
        await ChatService.add(message(n, 10));
    }

    const stored = storedMessages(fake);
    assert.ok(stored <= 500, `${stored} messages are kept forever`);

    fake.log.length = 0;
    const last = await ChatService.get();
    assert.deepStrictEqual(last.map((m) => m.msg), range(574, 599));
    const largest = Math.max(0, ...fake.log.map((c) => c.size));
    assert.ok(largest <= 26, `showing 26 messages pulled ${largest} entries out of Redis`);
});

test('a legacy chat_hash is carried over once inside Redis, and then deleted', async () => {
    const { fake, ChatService } = freshChat();
    legacyHash(fake, shuffled(3000));

    const last = await ChatService.get();

    assert.deepStrictEqual(last.map((m) => m.msg), range(2974, 2999));
    assert.strictEqual(fake.store.has('chat_hash'), false, 'the legacy hash must be deleted once carried over');
    assert.ok(
        !fake.log.some((c) => ['hgetall', 'hscan', 'hvals'].includes(c.name)),
        'the legacy hash must never be read into the backend',
    );
    const largest = Math.max(0, ...fake.log.map((c) => c.size));
    assert.ok(largest <= 26, `one reply carried ${largest} entries`);
    assert.ok(storedMessages(fake) <= 500);

    await ChatService.add(message(5000));
    const after = await ChatService.get();

    assert.deepStrictEqual(after.map((m) => m.msg), [...range(2975, 2999), 'm5000']);
    assert.strictEqual(fake.log.filter((c) => c.name === 'eval').length, 1, 'the carry-over runs once');
});

test('concurrent first calls carry the legacy history over exactly once', async () => {
    const { fake, ChatService } = freshChat();
    legacyHash(fake, shuffled(40));

    await Promise.all([ChatService.get(), ChatService.add(message(100)), ChatService.get()]);

    assert.strictEqual(fake.store.has('chat_hash'), false);
    assert.strictEqual(storedMessages(fake), 41, 'every legacy message is kept once, next to the new one');
    const last = await ChatService.get();
    assert.deepStrictEqual(last.map((m) => m.msg), [...range(15, 39), 'm100']);
});

test('two backend processes starting together carry the legacy history over exactly once', async () => {
    const { fake, ChatService: first } = freshChat();
    delete require.cache[managerPath];
    delete require.cache[chatPath];
    const second = require('../src/services/chat');
    legacyHash(fake, shuffled(40));

    await Promise.all([first.get(), second.get()]);

    assert.strictEqual(fake.store.has('chat_hash'), false);
    assert.strictEqual(storedMessages(fake), 40, 'every legacy message is stored once');
    assert.deepStrictEqual((await second.get()).map((m) => m.msg), range(14, 39));
});

test('a corrupt legacy entry is dropped instead of breaking the chat', async () => {
    const { fake, ChatService } = freshChat();
    const hash = legacyHash(fake, [0, 1, 2]);
    hash.set('broken', '{not json');

    const last = await ChatService.get();

    assert.deepStrictEqual(last.map((m) => m.msg), ['m0', 'm1', 'm2']);
    assert.strictEqual(fake.store.has('chat_hash'), false);
});

const REAL_REDIS_CHILD = `
const redis = require('redis');
const manager = require(${JSON.stringify(managerPath)});
const raw = redis.createClient(Number(process.env.REDIS_PORT) || 6379, process.env.REDIS_HOST || 'localhost');
const call = (name, ...args) => new Promise((resolve, reject) => raw[name](...args, (e, r) => (e ? reject(e) : resolve(r))));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const prefix = 'test:chat:' + process.pid + ':' + Date.now();
const list = prefix + ':list';
const hash = prefix + ':hash';
const report = (result) => { console.log('RESULT ' + JSON.stringify(result)); };

(async () => {
    let up = false;
    for (let i = 0; i < 50 && !up; i += 1) {
        try { await manager.getListRange(list, 0, 0); up = true; } catch (e) { await sleep(100); }
    }
    if (!up) { report({ unavailable: true }); return; }
    try {
        for (let i = 0; i < 8; i += 1) { await manager.appendToCappedList(list, 'n' + i, 5); }
        const capped = await manager.getListRange(list, 0, -1);
        const lastTwo = await manager.getListRange(list, -2, -1);
        const missing = await manager.getListRange(prefix + ':none', -26, -1);

        const adopted = prefix + ':adopted';
        const fields = [];
        for (let i = 0; i < 600; i += 1) {
            const n = (i * 7919) % 600;
            fields.push('u' + n, JSON.stringify({ msg: 'm' + n, time: 1700000000 + n }));
        }
        fields.push('broken', '{not json', 'array', '[1,2]');
        await call('hmset', hash, ...fields);
        await call('rpush', adopted, JSON.stringify({ msg: 'live', time: 1800000000 }));

        const moved = await manager.adoptLegacyHash(hash, adopted, 500);
        const afterFirst = (await manager.getListRange(adopted, 0, -1)).map((raw) => JSON.parse(raw).msg);
        const hashLeft = await call('exists', hash);
        const movedAgain = await manager.adoptLegacyHash(hash, adopted, 500);
        const afterSecond = await call('llen', adopted);
        const nothing = await manager.adoptLegacyHash(prefix + ':none', prefix + ':empty', 500);
        await call('del', adopted);

        report({
            capped, lastTwo, missing, moved, afterFirst, hashLeft, movedAgain, afterSecond, nothing,
        });
    } finally {
        await call('del', list, hash);
    }
})().catch((e) => report({ error: e.message })).then(() => process.exit(0));
`;

test('the list helpers keep their contract on a real Redis', {
    skip: !process.env.CI && !process.env.REDIS_PORT && 'needs a Redis: set REDIS_PORT (CI uses its service on 6379)',
}, async () => {
    const child = spawn(process.execPath, ['-e', REAL_REDIS_CHILD], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, NODE_ENV: 'development' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    await new Promise((resolve) => child.on('close', resolve));
    const line = stdout.split('\n').find((l) => l.startsWith('RESULT '));
    assert.ok(line, `no result:\n${stderr}`);
    const result = JSON.parse(line.slice('RESULT '.length));

    assert.ok(!result.unavailable, 'no Redis answered');
    assert.strictEqual(result.error, undefined, result.error);
    assert.deepStrictEqual(result.capped, ['n3', 'n4', 'n5', 'n6', 'n7']);
    assert.deepStrictEqual(result.lastTwo, ['n6', 'n7']);
    assert.deepStrictEqual(result.missing, []);
    assert.strictEqual(result.moved, 500);
    assert.strictEqual(result.afterFirst.length, 500);
    assert.deepStrictEqual(
        result.afterFirst,
        [...Array.from({ length: 499 }, (_, i) => `m${101 + i}`), 'live'],
        'the newest legacy messages, oldest first, in front of the live list',
    );
    assert.strictEqual(result.hashLeft, 0);
    assert.strictEqual(result.movedAgain, 0, 'a second run finds nothing to move');
    assert.strictEqual(result.afterSecond, 500);
    assert.strictEqual(result.nothing, 0);
});
