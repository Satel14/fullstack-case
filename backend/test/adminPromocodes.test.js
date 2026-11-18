const { resetTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const sequelize = require('../src/config/db');
const AdminActionService = require('../src/services/adminAction');
const MESSAGE = require('../src/constant/responseMessages');

test.after(async () => { await sequelize.close(); });

const controller = () => require('../src/controllers/admin/promocodes');
const future = () => new Date(Date.now() + 86400000).toISOString();
const input = () => ({ code: 'SUMMER_50', bonus: '50', limit: 10 });
const request = async (method, body = {}, code = 'SUMMER_50') => {
    const req = { body, params: { code }, user: { profile: { user_id: 7 } } };
    if (method !== 'list') {
        await Promise.all(controller().validate(method).map((rule) => rule.run(req)));
    }
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(status) { this.statusCode = status; return this; },
            json(payload) { resolve({ status: this.statusCode, ...payload }); },
        };
        controller()[method](req, res);
    });
};
const journal = () => AdminActionService.list();
const stored = async () => {
    const [rows] = await sequelize.query('SELECT * FROM promocodes ORDER BY code');
    return rows;
};
const quietly = async (fn) => {
    const lines = [];
    const original = console.error;
    console.error = (...args) => lines.push(args.map(String).join(' '));
    try { return { result: await fn(), lines }; } finally { console.error = original; }
};

test('create normalises the bonus, supplies defaults and journals the new fields', async () => {
    await resetTestDatabase();
    const result = await request('create', input());
    assert.equal(result.status, 200);
    assert.deepEqual({ ...result.data, created_at: null }, {
        code: 'SUMMER_50', bonus: 50, limit: 10, used: 0, description: '', active: true, expiresAt: null, created_at: null,
    });
    assert.ok(new Date(result.data.created_at).getTime());
    const [row] = await stored();
    assert.equal(row.bonus, '50.00');
    assert.equal(row.active, 1);
    assert.equal(row.expiresAt, null);
    assert.deepEqual(typeof row.used_ids === 'string' ? JSON.parse(row.used_ids) : row.used_ids, []);
    const [entry] = await journal();
    assert.deepEqual([entry.adminId, entry.action, entry.targetType, entry.targetId], [7, 'promocode.create', 'promocode', 'SUMMER_50']);
    assert.deepEqual(entry.payload, {
        before: {}, after: { code: 'SUMMER_50', bonus: 50, limit: 10, description: '', active: true, expiresAt: null },
    });
});

test('list gives every code newest first and exposes counts without player ids', async () => {
    await resetTestDatabase();
    await request('create', input());
    await sequelize.query("UPDATE promocodes SET used_ids = '[1001,1002]', created_at = '2026-01-01' WHERE code = 'SUMMER_50'");
    const expiresAt = future();
    assert.equal((await request('create', { ...input(), code: 'NEW', bonus: 0.01, active: false, expiresAt, description: 'gift' })).status, 200);
    const result = await request('list');
    assert.equal(result.status, 200);
    assert.deepEqual(result.data.map((row) => row.code), ['NEW', 'SUMMER_50']);
    assert.deepEqual(result.data.map((row) => [row.bonus, row.used, row.active]), [[0.01, 0, false], [50, 2, true]]);
    assert.equal(new Date(result.data[0].expiresAt).getTime(), Math.floor(new Date(expiresAt).getTime() / 1000) * 1000);
    result.data.forEach((row) => assert.deepEqual(Object.keys(row).sort(), ['active', 'bonus', 'code', 'created_at', 'description', 'expiresAt', 'limit', 'used'].sort()));
});

test('case-insensitive concurrent creates are decided by the primary key and journal only the winner', async () => {
    await resetTestDatabase();
    const { result, lines } = await quietly(() => Promise.all([
        request('create', { ...input(), code: 'ABC' }), request('create', { ...input(), code: 'abc' }),
    ]));
    assert.deepEqual(result.map((answer) => answer.status).sort(), [200, 422]);
    assert.equal(result.find((answer) => answer.status === 422).message, MESSAGE.PROMOCODE.ALREADY_EXISTS);
    assert.deepEqual(lines, []);
    assert.equal((await stored()).length, 1);
    assert.equal((await journal()).length, 1);
});

test('update changes only mutable fields and journals only actual differences', async () => {
    await resetTestDatabase();
    await request('create', input());
    const expiresAt = future();
    const changed = await request('update', { active: false, limit: 20, expiresAt, description: 'Updated' }, 'summer_50');
    assert.equal(changed.status, 200);
    assert.deepEqual([changed.data.code, changed.data.bonus, changed.data.limit, changed.data.active, changed.data.description], ['SUMMER_50', 50, 20, false, 'Updated']);
    const [entry] = await journal();
    assert.deepEqual([entry.action, entry.targetType, entry.targetId], ['promocode.update', 'promocode', 'SUMMER_50']);
    assert.deepEqual(entry.payload.before, { active: true, limit: 10, expiresAt: null, description: '' });
    assert.deepEqual(entry.payload.after, { active: false, limit: 20, expiresAt: new Date(changed.data.expiresAt).toISOString(), description: 'Updated' });
    assert.equal((await request('update', { expiresAt: null, active: false })).status, 200);
    const [cleared] = await journal();
    assert.deepEqual(cleared.payload, { before: { expiresAt: new Date(changed.data.expiresAt).toISOString() }, after: { expiresAt: null } });
    assert.equal((await request('update', { active: false })).status, 200);
    const entries = await journal();
    assert.equal(entries.length, 4);
    assert.deepEqual(entries[0].payload, { before: {}, after: {} });
});

test('a limit may equal uses but cannot be reduced below them, and code and bonus stay fixed', async () => {
    await resetTestDatabase();
    await request('create', input());
    await sequelize.query("UPDATE promocodes SET used_ids = '[1,2]' WHERE code = 'SUMMER_50'");
    const before = await stored();
    assert.equal((await request('update', { limit: 1 })).message, MESSAGE.PROMOCODE.LIMIT_BELOW_USED);
    for (const body of [{ bonus: 100 }, { code: 'RENAMED' }, { active: false, bonus: 100 }, {}]) {
        assert.equal((await request('update', body)).status, 422);
    }
    assert.deepEqual(await stored(), before);
    assert.equal((await journal()).length, 1);
    assert.equal((await request('update', { limit: 2 })).status, 200);
    assert.equal((await request('update', { active: true }, 'MISSING')).message, MESSAGE.PROMOCODE.NOT_EXIST);
});

test('an update waits for the redemption lock and checks the uses committed while it waited', async () => {
    await resetTestDatabase();
    await request('create', input());
    const transaction = await sequelize.transaction();
    let pending;
    try {
        await sequelize.query("SELECT code FROM promocodes WHERE code = 'SUMMER_50' FOR UPDATE", { transaction });
        pending = request('update', { limit: 1 });
        const outcome = await Promise.race([
            pending.then(() => 'answered'),
            new Promise((resolve) => setTimeout(() => resolve('waiting'), 150)),
        ]);
        assert.equal(outcome, 'waiting');
        await sequelize.query("UPDATE promocodes SET used_ids = '[1,2]' WHERE code = 'SUMMER_50'", { transaction });
    } finally { await transaction.commit(); }
    const result = await pending;
    assert.deepEqual([result.status, result.message], [422, MESSAGE.PROMOCODE.LIMIT_BELOW_USED]);
    assert.equal((await stored())[0].limit, 10);
    assert.equal((await journal()).length, 1);
});

for (const method of ['create', 'update']) {
    test(`a failed journal insert rolls back a promocode ${method} and logs only the unexpected failure`, async () => {
        await resetTestDatabase();
        if (method === 'update') { await request('create', input()); }
        const before = await stored();
        const entries = await journal();
        const record = AdminActionService.record;
        AdminActionService.record = async () => { throw new Error('journal is down'); };
        try {
            const { result, lines } = await quietly(() => request(method, method === 'create' ? input() : { active: false }));
            assert.deepEqual([result.status, result.message], [500, MESSAGE.SERVER.ERROR]);
            assert.equal(lines.length, 1);
            assert.match(lines[0], /journal is down/);
        } finally { AdminActionService.record = record; }
        assert.deepEqual(await stored(), before);
        assert.deepEqual(await journal(), entries);
    });
}

test('real input chains reject malformed values and count stored Unicode characters correctly', async () => {
    const passes = async (method, body, code = 'ABC') => {
        const req = { body, params: { code } };
        await Promise.all(controller().validate(method).map((rule) => rule.run(req)));
        return validationResult(req).isEmpty();
    };
    for (const body of [input(), { ...input(), code: 'A'.repeat(32), bonus: 100000, limit: 2147483647, active: true, expiresAt: future(), description: '😀'.repeat(255) }]) {
        assert.equal(await passes('create', body), true, JSON.stringify(body));
    }
    const invalid = {
        code: ['AB', 'A'.repeat(33), 'A B', 'ABC\n', 'код', null, ['ABC'], {}],
        bonus: [0, -1, 100000.01, '0.001', '1e2', '0x10', '50,00', '', null, true, [50, 60], {}],
        limit: [0, -1, 2147483648, 1.5, '1e2', null, [1, 2], {}],
        active: ['true', 'false', 1, 0, null, [true], {}],
        expiresAt: ['2030-01-01', '2000-01-01T00:00:00Z', '2099-02-30T12:00:00Z', '9999-12-31T23:59:59-02:00', 'invalid', null, [future()], {}],
        description: ['a'.repeat(256), `a${'\uFE0F'.repeat(255)}`, null, 1, ['x'], {}],
    };
    for (const [field, values] of Object.entries(invalid)) {
        for (const value of values) {
            assert.equal(await passes('create', { ...input(), [field]: value }), false, `${field}: ${JSON.stringify(value)}`);
            if (['active', 'limit', 'expiresAt', 'description'].includes(field) && !(field === 'expiresAt' && value === null)) {
                assert.equal(await passes('update', { [field]: value }), false, `update ${field}: ${JSON.stringify(value)}`);
            }
        }
    }
    for (const field of ['code', 'bonus', 'limit']) {
        const body = input();
        delete body[field];
        assert.equal(await passes('create', body), false, `missing ${field}`);
    }
    assert.equal(await passes('update', { expiresAt: null }), true);
    for (const code of ['AB', 'A B', 'ABC\n', ['ABC']]) {
        assert.equal(await passes('update', { active: false }, code), false);
    }
});

test('all promocode routes carry the ordered admin guards and no delete exists', () => {
    const express = require('express');
    const { adminLimiter } = require('../src/middleware/rateLimiters');
    const { authenticate } = require('../src/middleware/authenticate');
    const { adminOnly } = require('../src/middleware/adminOnly');
    const app = express();
    require('../src/routes/admin')(app);
    const routes = app._router.stack.filter((layer) => layer.route && layer.route.path.includes('promocode')).map((layer) => layer.route);
    assert.deepEqual(routes.map((route) => [Object.keys(route.methods)[0], route.path]), [
        ['get', '/api/admin/promocodes'], ['post', '/api/admin/promocode'], ['put', '/api/admin/promocode/:code'],
    ]);
    routes.forEach((route) => assert.deepEqual(route.stack.slice(0, 3).map((layer) => layer.handle), [adminLimiter, authenticate, adminOnly]));
});

test('a list outage answers a generic 500 and logs the unexpected failure once', async () => {
    const Promocode = require('../src/models/promocode');
    const findAll = Promocode.findAll;
    Promocode.findAll = async () => { throw new Error('database is down'); };
    try {
        const { result, lines } = await quietly(() => request('list'));
        assert.deepEqual([result.status, result.message], [500, MESSAGE.SERVER.ERROR]);
        assert.equal(result.data, undefined);
        assert.equal(lines.length, 1);
        assert.match(lines[0], /database is down/);
    } finally { Promocode.findAll = findAll; }
});
