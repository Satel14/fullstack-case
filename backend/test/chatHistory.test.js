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

test('a legacy chat_hash is carried over once, page by page, and then deleted', async () => {
    const { fake, ChatService } = freshChat();
    legacyHash(fake, shuffled(3000));

    const last = await ChatService.get();

    assert.deepStrictEqual(last.map((m) => m.msg), range(2974, 2999));
    assert.strictEqual(fake.store.has('chat_hash'), false, 'the legacy hash must be deleted once carried over');
    assert.ok(!fake.log.some((c) => c.name === 'hgetall'), 'the legacy hash must never be read whole');
    const largest = Math.max(0, ...fake.log.map((c) => c.size));
    assert.ok(largest <= 1000, `one reply carried ${largest} of 3000 legacy entries`);
    assert.ok(storedMessages(fake) <= 500);

    const scans = fake.log.filter((c) => c.name === 'hscan').length;
    await ChatService.add(message(5000));
    const after = await ChatService.get();

    assert.deepStrictEqual(after.map((m) => m.msg), [...range(2975, 2999), 'm5000']);
    assert.strictEqual(fake.log.filter((c) => c.name === 'hscan').length, scans, 'the carry-over runs once');
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

        const fields = [];
        for (let i = 0; i < 1000; i += 1) { fields.push('f' + i, 'v' + i); }
        await call('hmset', hash, ...fields);
        const seen = new Set();
        let cursor = '0';
        let largest = 0;
        do {
            const page = await manager.scanHash(hash, cursor, 50);
            cursor = page.cursor;
            largest = Math.max(largest, page.entries.length);
            page.entries.forEach(([field, value]) => seen.add(field + '=' + value));
        } while (cursor !== '0');
        const empty = await manager.scanHash(prefix + ':none', '0', 50);

        await manager.moveIntoCappedList(hash, list, ['o1', 'o2', 'o3'], 7);
        const merged = await manager.getListRange(list, 0, -1);
        const hashLeft = await call('exists', hash);

        report({ capped, lastTwo, missing, seen: seen.size, largest, empty, merged, hashLeft });
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
    assert.strictEqual(result.seen, 1000);
    assert.ok(result.largest < 1000, `one HSCAN page returned ${result.largest} of 1000 fields`);
    assert.deepStrictEqual(result.empty, { cursor: '0', entries: [] });
    assert.deepStrictEqual(result.merged, ['o2', 'o3', 'n3', 'n4', 'n5', 'n6', 'n7']);
    assert.strictEqual(result.hashLeft, 0);
});
