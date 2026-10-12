const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { resetTestDatabase } = require('./helpers/db');
const { createMigrator } = require('../src/db/migrator');

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

const INDEX_MIGRATION = '20260930000000-storage-status-updated-index.js';

const storageIndexes = async (sequelize) => (await sequelize.getQueryInterface().showIndex('storage'))
    .map((i) => i.name);

test('the migrations index storage by status and update time, and the revert drops only that index', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    assert.ok((await storageIndexes(sequelize)).includes('storage_status_updated_at'));

    await createMigrator(sequelize, { quiet: true }).down({ to: INDEX_MIGRATION });
    const after = await storageIndexes(sequelize);
    assert.ok(!after.includes('storage_status_updated_at'));
    assert.ok(after.includes('storage_user_id_status'));

    const cli = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'migrate.js'), 'utf8');
    assert.ok(cli.includes(`'${INDEX_MIGRATION}':`), 'the revert must name what it costs in DOWN_EFFECTS');
});
