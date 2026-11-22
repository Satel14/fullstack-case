const { resetTestDatabase, assertSafeTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const sequelize = require('../src/config/db');

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

const StorageService = require('../src/services/storage');
const StorageController = require('../src/controllers/storage');
const StatsController = require('../src/controllers/stats');
const AdminStatsService = require('../src/services/adminStats');
const AdminUserCardService = require('../src/services/adminUserCard');
const BonusService = require('../src/services/bonus');
const { signToken } = require('../src/auth/token');
const DATE = new Date('2026-11-23T12:00:00Z');

test.before(() => assertSafeTestDatabase());
test.after(() => sequelize.close());

test.beforeEach(async () => {
    await resetTestDatabase();
    const qi = sequelize.getQueryInterface();
    await qi.bulkInsert('users', [1, 2, 3, 4].map((id) => ({
        id, login: `player${id}`, email: `player${id}@example.test`, role: 1,
    })));
    await qi.bulkInsert('cases', [
        { id: 'dust2', title: 'Dust II', price: 100, published: 1 },
        { id: 'mirage', title: 'Mirage', price: 100, published: 1 },
    ]);
    await qi.bulkInsert('items', [100, 200, 300].map((id) => ({
        itemId: id, name: `Item ${id}`, colors: '["default","painted"]',
    })));
    await qi.bulkInsert('insider_prices', [
        { name: 'Item 100', pricesInCredits: JSON.stringify({ default: 2, painted: 3 }) },
        { name: 'Item 200', pricesInCredits: JSON.stringify({ default: 20, painted: 25 }) },
        { name: 'Item 300', pricesInCredits: JSON.stringify({ default: 1000, painted: 2000 }) },
    ]);
    const drops = [
        [1, 100, 'default', 'dust2', 'inventory'],
        [1, 200, 'default', 'dust2', 'money'],
        [1, 100, 'default', 'mirage', 'received'],
        [2, 100, 'default', 'mirage', 'inventory'],
        [2, 100, 'default', 'mirage', 'inventory'],
        [1, 300, 'painted', null, 'inventory'],
        [1, 300, 'default', null, 'received'],
        [1, 200, 'painted', null, 'money'],
        [1, 200, 'default', null, 'inventory'],
        [1, 300, 'painted', null, 'inventory'],
        [3, 100, 'default', null, 'inventory'],
        [3, 100, 'default', null, 'inventory'],
        [3, 300, 'painted', null, 'received'],
        [null, 100, 'default', 'dust2', 'inventory'],
    ];
    await qi.bulkInsert('storage', drops.map(([userId, itemId, color, caseId, status], index) => ({
        id: index + 1, userId, itemId, color, caseId, status, created_at: DATE, updated_at: DATE,
    })));
});

const upgradeCaseStake = () => sequelize.query("UPDATE storage SET status = 'upgraded' WHERE id = 2");

const storageAnswer = async (handler, params) => {
    const req = { params, body: {} };
    await Promise.all(StorageController.validate(handler).map((rule) => rule.run(req)));
    const res = {
        code: 200,
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; return this; },
    };
    await StorageController[handler](req, res);
    assert.equal(res.code, 200, JSON.stringify(res.body));
    return res.body;
};

const recordCaseOpen = () => sequelize.getQueryInterface().bulkInsert('case_opens', [{
    userId: 1, caseId: 'dust2', storageId: 2, resultItemId: 200, resultColor: 'default',
    pricePaid: '100.00', drawTable: JSON.stringify({ PRICES: { 200: { default: '20.00' } } }), created_at: DATE,
}]);

test('profile opened-case counts exclude upgrade wins and retain upgraded case stakes', async () => {
    await upgradeCaseStake();
    assert.equal(await StorageService.getStorageItemsCountByUserId(1), 3);
    assert.equal(await StorageService.getStorageItemsCountByUserId(2), 2);
    assert.equal(await StorageService.getStorageItemsCountByUserId(3), 0);
    assert.equal(await StorageService.getStorageItemsCountByUserId(4), 0);
});

test('global opened-case counts exclude upgrade wins even when filtering by status', async () => {
    await upgradeCaseStake();
    assert.equal(await StorageService.getCountOpenedCases(), 6);
    assert.equal(await StorageService.getCountOpenedCases('received'), 1);
    assert.equal(await StorageService.getCountOpenedCases('upgraded'), 1);
});

test('top players count case drops in every status, exclude upgrade-only players and keep pagination', async () => {
    await upgradeCaseStake();
    assert.deepEqual(await StorageService.getTopUsersByItemCount(50, 0), [
        { userId: 1, count: 3 }, { userId: 2, count: 2 },
    ]);
    const { data } = await storageAnswer('getStorageTop', { limit: '1', offset: '1' });
    assert.deepEqual(data.map(({ userId, count }) => ({ userId, count })), [{ userId: 2, count: 2 }]);
    assert.equal(data[0].info.user_login, 'player2');
});

test('the favourite case ignores the larger NULL group and still counts upgraded stakes', async () => {
    await upgradeCaseStake();
    assert.equal(await StorageService.getFavoriteCaseIdByUserId(1), 'dust2');
    assert.equal(await StorageService.getFavoriteCaseIdByUserId(3), null);
    assert.equal(await StorageService.getFavoriteCaseIdByUserId(4), null);
    const { data } = await storageAnswer('getFavoriteCaseByUserId', { id: '1' });
    assert.equal(data.case_id, 'dust2');
});

test('profile unique-case counts ignore upgrade wins while best drop can be the newest upgrade win', async () => {
    const answer = await storageAnswer('getStorageItemsCountByUserId', { id: '1' });
    assert.equal(answer.data, 3);
    assert.equal(answer.uniqueCases, 2);
    assert.deepEqual(answer.bestDrop, { storage_id: 10, storage_itemId: 300, storage_color: 'painted' });
    const upgradesOnly = await storageAnswer('getStorageItemsCountByUserId', { id: '3' });
    assert.equal(upgradesOnly.data, 0);
    assert.equal(upgradesOnly.uniqueCases, 0);
    assert.deepEqual(upgradesOnly.bestDrop, { storage_id: 13, storage_itemId: 300, storage_color: 'painted' });
});

test('the header counts opened cases separately from received items of either source', async () => {
    const res = {
        code: 200,
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; return this; },
    };
    await StatsController.getSiteStats({}, res);
    assert.equal(res.code, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.openedCases, 6);
    assert.equal(res.body.data.receivedItems, 3);
});

test('POST /api/profile/storage accepts upgraded and returns only that player\'s consumed stakes', async (t) => {
    await upgradeCaseStake();
    await sequelize.query("UPDATE storage SET status = 'upgraded' WHERE id IN (6, 11)");
    const app = express();
    app.use(express.json());
    require('../src/routes/storage')(app);
    const server = await new Promise((resolve) => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/profile/storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signToken({ user_id: 1 })}` },
        body: JSON.stringify({ status: 'upgraded' }),
    });
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.deepEqual(data.map(({ storage_id, storage_status }) => [storage_id, storage_status]), [[6, 'upgraded'], [2, 'upgraded']]);
});

test('admin statistics count the case-open audit trail and withdrawals of either source', async () => {
    await upgradeCaseStake();
    await recordCaseOpen();
    const report = await AdminStatsService.get({ from: '2026-11-23T00:00:00Z', to: '2026-11-24T00:00:00Z' });
    assert.equal(report.totals.opens, 1);
    assert.equal(report.totals.withdrawalsCompleted, 3);
    assert.deepEqual(report.cases.map(({ caseId, opens }) => ({ caseId, opens })), [{ caseId: 'dust2', opens: 1 }]);
});

test('the admin player card keeps upgrade inventory separate from audited case opens', async () => {
    await upgradeCaseStake();
    await recordCaseOpen();
    const card = await AdminUserCardService.get(1);
    assert.deepEqual(card.opens.map(({ caseId }) => caseId), ['dust2']);
    assert.deepEqual(card.inventory.counts, { inventory: 4, received: 2, waitingtrade: 0, money: 1, upgraded: 1 });
    assert.equal(card.inventory.items.length, 8);
    const wins = card.inventory.items.filter(({ caseId }) => caseId === null);
    assert.equal(wins.length, 5);
    assert.ok(wins.every(({ caseTitle }) => caseTitle === null));
    const upgradesOnly = await AdminUserCardService.get(3);
    assert.deepEqual(upgradesOnly.opens, []);
    assert.equal(upgradesOnly.inventory.items.length, 3);
});

test('upgrade wins alone do not satisfy the first-case bonus, but a received win satisfies first-withdrawal', async () => {
    const states = await BonusService.stateFor(3, DATE);
    assert.equal(states.find(({ id }) => id === 'first-case').available, false);
    assert.equal(states.find(({ id }) => id === 'first-withdrawal').available, true);
});
