const { resetTestDatabase, assertSafeTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { validationResult } = require('express-validator');
const sequelize = require('../src/config/db');
const { signToken } = require('../src/auth/token');
const MESSAGE = require('../src/constant/responseMessages');
const allCases = require('../src/constant/cases/_all');
const { itemOdds } = require('../src/modules/provablyFair');

const itemHash = {};
const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true,
    exports: { getAllDataHashWithKey: async () => itemHash },
};

const StatsController = require('../src/controllers/admin/stats');
const StatsService = require('../src/services/adminStats');

const FROM = '2026-10-01T00:00:00.000Z';
const TO = '2026-11-01T00:00:00.000Z';
const INSIDE = '2026-10-15 12:00:00';
const query = { from: FROM, to: TO };

test.before(() => assertSafeTestDatabase());
test.after(() => sequelize.close());

const respond = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler(req, res);
});

const read = async (dates = query) => {
    const req = { query: dates };
    await Promise.all(StatsController.validate('get').map((rule) => rule.run(req)));
    return respond(StatsController.get, req);
};

const ledger = (type, change, at = INSIDE) => sequelize.query(
    'INSERT INTO balance_history (userId, type, balanceChange, extraData, created_at) VALUES (1, ?, ?, ?, ?)',
    { replacements: [type, change, '', at] },
);

const open = ({ caseId = 'dust2', spent = '100.00', price = '75.25', color = 'default', at = INSIDE, table } = {}) => sequelize.query(
    'INSERT INTO case_opens (userId, caseId, resultItemId, resultColor, pricePaid, drawTable, created_at) VALUES (1, ?, 1241, ?, ?, ?, ?)',
    { replacements: [caseId, color, spent, table === undefined ? JSON.stringify({ PRICES: { 1241: { default: price, painted: '200.15' } } }) : table, at] },
);

const data = async () => {
    const result = await read();
    assert.equal(result.code, 200, JSON.stringify(result.payload));
    return result.payload.data;
};

test('stats are mounted with the admin limiter, authentication, authorization and their own rules', () => {
    const app = express();
    require('../src/routes/admin')(app);
    const route = app._router.stack.find((layer) => layer.route?.path === '/api/admin/stats')?.route;
    assert.ok(route);
    assert.equal(route.methods.get, true);
    const handles = route.stack.map((layer) => layer.handle);
    assert.equal(handles[0], require('../src/middleware/rateLimiters').adminLimiter);
    assert.equal(handles[1], require('../src/middleware/authenticate').authenticate);
    assert.equal(handles[2], require('../src/middleware/adminOnly').adminOnly);
    assert.ok(handles.slice(3, -1).every((handler) => typeof handler.run === 'function'));
    assert.equal(handles.at(-1), StatsController.get);
});

test('HTTP stats reject guests and players and answer the administrator', async (t) => {
    await resetTestDatabase();
    await sequelize.query("INSERT INTO users (id, login, password, email, role) VALUES (1, 'owner', 'x', 'owner@e.ua', 10), (2, 'player', 'x', 'player@e.ua', 1)");
    const app = express();
    app.set('query parser', 'simple');
    require('../src/routes/admin')(app);
    const server = await new Promise((resolve) => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/api/admin/stats`;
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${signToken({ user_id: 2 })}` } })).status, 403);
    const headers = { Authorization: `Bearer ${signToken({ user_id: 1 })}` };
    const answer = await fetch(url, { headers });
    assert.equal(answer.status, 200);
    assert.equal((await answer.json()).data.totals.opens, 0);
    assert.equal((await fetch(`${url}?from=2026-10-01&from=2026-10-02`, { headers })).status, 422);
});

test('the default period is the last 30 days and a single end date anchors it', async (t) => {
    const seen = [];
    t.mock.method(StatsService, 'get', async (period) => { seen.push(period); return {}; });
    const before = Date.now();
    assert.equal((await read({})).code, 200);
    const after = Date.now();
    assert.ok(new Date(seen[0].to).getTime() >= before && new Date(seen[0].to).getTime() <= after);
    assert.equal(new Date(seen[0].to) - new Date(seen[0].from), 30 * 86400000);
    assert.equal((await read({ to: TO })).code, 200);
    assert.deepEqual(seen[1], { from: '2026-10-02T00:00:00.000Z', to: TO });
    assert.equal((await read({ from: new Date(after - 86400000).toISOString() })).code, 200);
    assert.ok(new Date(seen[2].to).getTime() >= after);
});

test('date rules refuse arrays, objects, invalid dates and timestamps without a timezone before SQL', async (t) => {
    t.mock.method(StatsService, 'get', async () => { throw new Error('must not query'); });
    const invalid = ['', null, 42, ['2026-10-01'], ['2026-10-01', 'x'], {}, '2026-02-30', '2026-13-01', '2026-10-01T12:00:00', '0000-01-01', '10000-01-01', '2026-10-01\nforged'];
    for (const field of ['from', 'to']) {
        for (const value of invalid) {
            const req = { query: { ...query, [field]: value } };
            await Promise.all(StatsController.validate('get').map((rule) => rule.run(req)));
            assert.equal(validationResult(req).isEmpty(), false, `${field}: ${JSON.stringify(value)}`);
            const result = await respond(StatsController.get, req);
            assert.deepEqual([result.code, result.payload.message], [422, MESSAGE.VALIDATOR.ERROR]);
        }
    }
    assert.equal(StatsService.get.mock.callCount(), 0);
});

test('periods are ordered, at most 365 days, and timezone dates normalize to UTC', async (t) => {
    t.mock.method(StatsService, 'get', async (period) => period);
    for (const dates of [
        { from: TO, to: FROM }, { from: FROM, to: FROM },
        { from: '2025-01-01', to: '2026-01-02' },
    ]) {
        const result = await read(dates);
        assert.deepEqual([result.code, result.payload.message], [422, MESSAGE.VALIDATOR.ERROR]);
    }
    assert.equal((await read({ from: '2025-01-01', to: '2026-01-01' })).code, 200);
    const result = await read({ from: '2026-10-01T03:00:00+03:00', to: '2026-11-01' });
    assert.deepEqual(result.payload.data, { from: FROM, to: TO });
});

test('totals use signed ledger types, snapshot winner prices and completion times within a half-open period', async () => {
    await resetTestDatabase();
    await open({ at: '2026-10-01 00:00:00' });
    await open({ caseId: 'havoc', color: 'painted', spent: '300.20' });
    await open({ at: '2026-09-30 23:59:59', price: '9000' });
    await open({ at: '2026-11-01 00:00:00', price: '9000' });
    for (const [type, amount] of [
        ['opencase', '-100.00'], ['opencase', '-300.20'], ['sellitem', '12.34'], ['sellitem', '0.01'],
        ['payment', '123.45'], ['bonus', '50.25'], ['promocode', '7.89'],
        ['admin_adjust', '20.50'], ['admin_adjust', '-3.25'], ['sendmoney', '900'], ['reset', '-800'],
    ]) { await ledger(type, amount); }
    await ledger('payment', '999.99', '2026-09-30 23:59:59');
    await ledger('payment', '999.99', '2026-11-01 00:00:00');
    await sequelize.query("INSERT INTO storage (userId, itemId, caseId, status, created_at, updated_at) VALUES "
        + "(1, 1241, 'dust2', 'received', '2026-09-01', '2026-10-01'),"
        + "(1, 1241, 'dust2', 'received', '2026-10-01', '2026-11-01'),"
        + "(1, 1241, 'dust2', 'waitingtrade', '2026-10-01', '2026-10-15'),"
        + "(1, 1241, 'dust2', 'money', '2026-10-01', '2026-10-15')");
    const report = await data();
    assert.deepEqual(report.period, { from: FROM, to: TO });
    assert.deepEqual(report.totals, {
        opens: 2, spent: '400.20', valueGiven: '275.40', knownValueGiven: '275.40', unvaluedOpens: 0,
        realizedEdge: '0.311844', sales: '12.35', deposits: '123.45', bonuses: '50.25',
        promocodes: '7.89', adminCorrections: '17.25', withdrawalsCompleted: 1,
    });
    assert.deepEqual(report.cases.map(({ caseId, opens, spent, valueGiven, realizedEdge }) => ({ caseId, opens, spent, valueGiven, realizedEdge })), [
        { caseId: 'dust2', opens: 1, spent: '100.00', valueGiven: '75.25', realizedEdge: '0.247500' },
        { caseId: 'havoc', opens: 1, spent: '300.20', valueGiven: '200.15', realizedEdge: '0.333278' },
    ]);
});

test('decimal aggregation stays exact even beyond JavaScript safe integer precision in minor units', async () => {
    await resetTestDatabase();
    const amounts = Array.from({ length: 10000 }, () => "(1, 'payment', 9999999999.99, '2026-10-15')").join(',');
    await sequelize.query(`INSERT INTO balance_history (userId, type, balanceChange, created_at) VALUES ${amounts}`);
    assert.equal((await data()).totals.deposits, '99999999999900.00');
});

test('no spend has no edge, and a loss-making case keeps its negative edge', async () => {
    await resetTestDatabase();
    let report = await data();
    assert.equal(report.totals.spent, '0.00');
    assert.equal(report.totals.valueGiven, '0.00');
    assert.equal(report.totals.realizedEdge, null);
    assert.deepEqual(report.cases, []);
    await open({ caseId: 'free-case', spent: '0.00', price: '0.00' });
    report = await data();
    assert.equal(report.cases[0].valueGiven, '0.00');
    assert.equal(report.cases[0].realizedEdge, null);
    await open({ spent: '100.00', price: '150.10' });
    await ledger('opencase', '-100.00');
    report = await data();
    assert.equal(report.totals.realizedEdge, '-0.501000');
    assert.equal(report.cases[0].realizedEdge, '-0.501000');
});

test('missing, corrupt and incomplete historical snapshots never turn into zero value or a plausible edge', async () => {
    await resetTestDatabase();
    await open();
    for (const table of [null, '{broken', '{}', JSON.stringify({ PRICES: { 1241: { default: 'bad' } } })]) {
        await open({ table });
    }
    await ledger('opencase', '-500.00');
    const report = await data();
    assert.equal(report.totals.unvaluedOpens, 4);
    assert.equal(report.totals.knownValueGiven, '75.25');
    assert.equal(report.totals.valueGiven, null);
    assert.equal(report.totals.realizedEdge, null);
    assert.equal(report.cases[0].valueGiven, null);
    assert.equal(report.cases[0].realizedEdge, null);
});

test('legacy spend is unknown per case while the ledger total remains exact, even if metadata is missing', async () => {
    await resetTestDatabase();
    await open({ caseId: 'removed-case', spent: null });
    await ledger('opencase', '-42.50');
    const report = await data();
    assert.equal(report.totals.spent, '42.50');
    assert.equal(report.cases[0].caseId, 'removed-case');
    assert.equal(report.cases[0].spent, null);
    assert.equal(report.cases[0].unpricedOpens, 1);
    assert.equal(report.cases[0].realizedEdge, null);
    assert.equal(report.cases[0].expectedEdge, null);
});

test('the current expected edge follows generator item weights and 90/10 prices at the effective sale price', async () => {
    await resetTestDatabase();
    await open();
    await sequelize.query("INSERT INTO cases (id, title, price, discount) VALUES ('dust2', 'Dust II', 200, 100)");
    const odds = itemOdds(allCases.dust2);
    let ev = 0;
    for (const [index, item] of allCases.dust2.ITEMS.entries()) {
        const prices = { default: 10 + index, painted: 100 + index };
        const name = `Stats item ${item.id}`;
        await sequelize.query('INSERT INTO items (itemId, name) VALUES (?, ?)', { replacements: [item.id, name] });
        await sequelize.query('INSERT INTO insider_prices (id, name, pricesInCredits) VALUES (?, ?, ?)', { replacements: [item.id, name, JSON.stringify(prices)] });
        ev += odds[item.id] * (0.9 * prices.default + 0.1 * prices.painted);
    }
    const row = (await data()).cases[0];
    assert.equal(row.title, 'Dust II');
    assert.equal(row.expectedEdge, (1 - ev / 100).toFixed(6));
    assert.equal(row.valueGiven, '75.25');
    await sequelize.query('DELETE FROM insider_prices LIMIT 1');
    assert.equal((await data()).cases[0].expectedEdge, null);
});

test('period scans have date-leading indexes and reuse the withdrawal completion index', async () => {
    await resetTestDatabase();
    for (const [table, name, fields] of [
        ['case_opens', 'case_opens_created_at', ['created_at']],
        ['balance_history', 'balance_history_created_at', ['created_at']],
        ['storage', 'storage_status_updated_at', ['status', 'updated_at']],
    ]) {
        const [indexes] = await sequelize.query(`SHOW INDEX FROM ${table}`);
        assert.deepEqual(indexes.filter((row) => row.Key_name === name).map((row) => row.Column_name), fields);
    }
    const migration = require('../migrations/20261118000200-admin-stats-indexes');
    const context = sequelize.getQueryInterface();
    await migration.up({ context });
    await migration.down({ context });
    const [dropped] = await sequelize.query("SHOW INDEX FROM case_opens WHERE Key_name = 'case_opens_created_at'");
    assert.deepEqual(dropped, []);
    await migration.up({ context });
});

test('new multi-opens retain their actual locked sale price in the audit record', async (t) => {
    await resetTestDatabase();
    for (const item of allCases.dust2.ITEMS) {
        itemHash[item.id] = JSON.stringify({ name: `Item ${item.id}`, rare: item.rare, pricesInCredits: JSON.stringify({ default: 10, painted: 20 }) });
    }
    await sequelize.query("INSERT INTO users (id, login, password, email, balance) VALUES (1, 'opener', 'x', 'opener@e.ua', 1000)");
    await sequelize.query("INSERT INTO cases (id, title, price, discount, published, openLimit) VALUES ('dust2', 'Dust II', 100, 25, 1, -1)");
    t.mock.method(console, 'log', () => {});
    const CaseService = require('../src/services/case');
    const originalFind = CaseService.findCaseById;
    t.mock.method(CaseService, 'findCaseById', async (id, options) => {
        const row = await originalFind(id, options);
        return options?.transaction ? row : { ...row.dataValues, case_discount: 10 };
    });
    const CaseController = require('../src/controllers/case');
    const result = await respond(CaseController.openCaseById, { body: { id: 'dust2', count: 2 }, user: { profile: { user_id: 1 } } });
    assert.equal(result.code, 200, JSON.stringify(result.payload));
    const [rows] = await sequelize.query('SELECT pricePaid FROM case_opens ORDER BY id');
    assert.deepEqual(rows.map((row) => row.pricePaid), ['25.00', '25.00']);
});

test('the actual aggregation plans use bounded date ranges on all growing tables', async (t) => {
    await resetTestDatabase();
    await open();
    await ledger('opencase', '-100.00');
    await sequelize.query("INSERT INTO storage (userId, status, updated_at) VALUES (1, 'received', '2026-10-15')");
    await sequelize.query('INSERT INTO storage (userId, status, updated_at) VALUES '
        + Array.from({ length: 1000 }, () => "(1, 'received', '2026-09-01')").join(','));
    const queries = [];
    const originalQuery = sequelize.query;
    t.mock.method(sequelize, 'query', function capture(sql, options) {
        if (typeof sql === 'string' && sql.includes('FORCE INDEX')) { queries.push([sql, options]); }
        return originalQuery.call(this, sql, options);
    });
    await data();
    assert.equal(queries.length, 3);
    for (const [sql, options] of queries) {
        const [plan] = await originalQuery.call(sequelize, `EXPLAIN ${sql}`, { replacements: options.replacements });
        const expectedIndex = sql.match(/FORCE INDEX \((\w+)\)/)[1];
        assert.ok(plan.some((row) => row.key === expectedIndex && row.type === 'range'), JSON.stringify(plan));
    }
});

test('an unexpected stats failure is logged once and answered through answerFailure without internal details', async (t) => {
    t.mock.method(StatsService, 'get', async () => { throw new Error('SELECT private query'); });
    const logged = [];
    t.mock.method(console, 'error', (...args) => logged.push(args));
    const result = await read();
    assert.deepEqual([result.code, result.payload], [500, { status: 500, message: MESSAGE.SERVER.ERROR }]);
    assert.equal(logged.length, 1);
});
