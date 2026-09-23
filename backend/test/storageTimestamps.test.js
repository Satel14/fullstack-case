const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

const StorageService = require('../src/services/storage');
const Storage = require('../src/models/storage');

const assertRecent = (value, label) => {
    assert.ok(value instanceof Date, `${label} should be a date, got ${value}`);
    assert.ok(Math.abs(value.getTime() - Date.now()) < 60 * 1000, `${label} ${value.toISOString()} is not now`);
};

test('an item added to the storage records when it was won', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    const storageId = await StorageService.addItem(1, 707, 'default', 'dust2');
    const row = await Storage.findByPk(storageId);

    assertRecent(row.created_at, 'created_at');
    assert.strictEqual(row.updated_at, null);

    const [history] = await StorageService.getStorageLastItemsByUserId(1, 5, 0);
    assertRecent(history.created_at, 'created_at in the public history');
});

test('a status change and a withdrawal contact record when they happened', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status, created_at) VALUES "
        + "(1, 707, 'default', 'dust2', 'inventory', '2026-01-01 00:00:00'), "
        + "(1, 708, 'default', 'dust2', 'inventory', '2026-01-01 00:00:00')",
    );

    await StorageService.setStorageStatusById(1, 'money');
    await StorageService.setStorageExtraDataById(2, 'steam:abc');

    for (const id of [1, 2]) {
        const row = await Storage.findByPk(id);
        assertRecent(row.updated_at, `updated_at of row ${id}`);
        assert.ok(row.created_at < row.updated_at, `created_at of row ${id} must stay as it was`);
    }
});
