const { resetTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const sequelize = require('../src/config/db');

test.after(async () => { await sequelize.close(); });

test('promocode status migration preserves old codes, defaults active and reverses cleanly', async () => {
    await resetTestDatabase();
    const migration = require('../migrations/20261029000100-promocode-status');
    const context = sequelize.getQueryInterface();
    await migration.down({ context });
    await sequelize.query("INSERT INTO promocodes (code, bonus, used_ids, `limit`) VALUES ('LEGACY', '50', '[1]', 10)");
    await migration.up({ context });

    const columns = await context.describeTable('promocodes');
    assert.match(columns.active.type, /tinyint\(1\)/i);
    assert.equal(columns.active.allowNull, false);
    assert.equal(Number(columns.active.defaultValue), 1);
    assert.match(columns.expiresAt.type, /datetime/i);
    assert.equal(columns.expiresAt.allowNull, true);
    const [[row]] = await sequelize.query("SELECT active, expiresAt, bonus, used_ids FROM promocodes WHERE code = 'LEGACY'");
    assert.equal(row.active, 1);
    assert.equal(row.expiresAt, null);
    assert.equal(row.bonus, '50');
    assert.deepEqual(typeof row.used_ids === 'string' ? JSON.parse(row.used_ids) : row.used_ids, [1]);
    await assert.rejects(() => sequelize.query("UPDATE promocodes SET active = NULL WHERE code = 'LEGACY'"));

    await migration.down({ context });
    const reverted = await context.describeTable('promocodes');
    assert.equal(reverted.active, undefined);
    assert.equal(reverted.expiresAt, undefined);
    const [[remaining]] = await sequelize.query("SELECT bonus FROM promocodes WHERE code = 'LEGACY'");
    assert.equal(remaining.bonus, '50');
    await migration.up({ context });
});
