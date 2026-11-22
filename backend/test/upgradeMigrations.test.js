const { resetTestDatabase, recreateTestDatabase, assertSafeTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sequelize = require('../src/config/db');
const { createMigrator } = require('../src/db/migrator');
const Storage = require('../src/models/storage');
const { STORAGE_STATUSES } = require('../src/constant/enums/storageStatus');

const STATUS_MIGRATION = '20261123000000-storage-upgraded-status.js';
const TABLE_MIGRATION = '20261123000100-upgrades.js';
const PREVIOUS_MIGRATION = '20261122000200-case-images-webp.js';
const ORIGINAL_STATUSES = ['inventory', 'received', 'waitingtrade', 'money'];
const statusColumn = async () => (await sequelize.query("SHOW COLUMNS FROM storage WHERE Field = 'status'"))[0][0];
const migrator = () => createMigrator(sequelize, { quiet: true });

test.before(() => assertSafeTestDatabase());
test.after(() => sequelize.close());

test('the status migration adds upgraded without changing existing statuses, rows or column defaults', async () => {
    await recreateTestDatabase();
    await migrator().up({ to: PREVIOUS_MIGRATION });
    const before = await statusColumn();
    const rows = [...ORIGINAL_STATUSES, null].map((status, index) => ({ id: index + 1, status }));
    await sequelize.getQueryInterface().bulkInsert('storage', rows);

    await migrator().up({ to: STATUS_MIGRATION });

    const after = await statusColumn();
    assert.equal(after.Type, "enum('inventory','received','waitingtrade','money','upgraded')");
    assert.equal(after.Null, before.Null);
    assert.equal(after.Default, before.Default);
    assert.deepEqual((await sequelize.query('SELECT id, status FROM storage ORDER BY id'))[0], rows);
    assert.deepEqual(STORAGE_STATUSES, [...ORIGINAL_STATUSES, 'upgraded']);
    assert.deepEqual(Storage.rawAttributes.storage_status.values, STORAGE_STATUSES);
    const upgraded = await Storage.create({ storage_status: 'upgraded' });
    assert.equal((await upgraded.reload()).storage_status, 'upgraded');
});

test('the status revert names storage and every upgraded row, then succeeds once they are gone', async () => {
    await resetTestDatabase();
    await sequelize.getQueryInterface().bulkInsert('storage', [
        { id: 1, userId: 1, caseId: 'dust2', status: 'upgraded' },
        { id: 2, userId: 2, caseId: null, status: 'upgraded' },
        { id: 3, userId: null, caseId: null, status: 'upgraded' },
        { id: 4, userId: 1, caseId: 'dust2', status: 'inventory' },
    ]);
    const before = await statusColumn();

    await assert.rejects(
        () => migrator().down({ migrations: [STATUS_MIGRATION] }),
        /Cannot remove upgraded: 3 storage row\(s\) still use it/,
    );
    assert.deepEqual(await statusColumn(), before);
    assert.equal(await Storage.count({ where: { storage_status: 'upgraded' } }), 3);
    assert.ok((await migrator().executed()).some(({ name }) => name === STATUS_MIGRATION));

    await Storage.destroy({ where: { storage_status: 'upgraded' } });
    await migrator().down({ migrations: [STATUS_MIGRATION] });

    const after = await statusColumn();
    assert.equal(after.Type, "enum('inventory','received','waitingtrade','money')");
    assert.equal(after.Null, before.Null);
    assert.equal(after.Default, before.Default);
    assert.equal(await Storage.count(), 1);
    await assert.rejects(() => Storage.create({ storage_status: 'upgraded' }), /Data truncated/);
    await migrator().up();
    assert.deepEqual(await statusColumn(), before);
});

test('the upgrades table has the contract columns, nullability, primary key and player history index', async () => {
    await resetTestDatabase();
    const [columns] = await sequelize.query('SHOW COLUMNS FROM upgrades');
    const types = {
        id: /^int(?:\(11\))?$/i,
        userId: /^int(?:\(11\))?$/i,
        seedId: /^int(?:\(11\))?$/i,
        serverSeedHash: /^varchar\(64\)$/i,
        clientSeed: /^varchar\(255\)$/i,
        nonce: /^int(?:\(11\))?$/i,
        stake: /^text$/i,
        stakeValue: /^decimal\(12,2\)$/i,
        targetItemId: /^int(?:\(11\))?$/i,
        targetColor: /^varchar\(16\)$/i,
        targetPrice: /^decimal\(12,2\)$/i,
        threshold: /^int(?:\(11\))?$/i,
        roll: /^int(?:\(11\))?$/i,
        won: /^tinyint\(1\)$/i,
        resultStorageId: /^int(?:\(11\))?$/i,
        created_at: /^datetime$/i,
    };
    assert.deepEqual(columns.map(({ Field }) => Field), Object.keys(types));
    for (const column of columns) {
        assert.match(column.Type, types[column.Field], column.Field);
        assert.equal(column.Null, column.Field === 'resultStorageId' ? 'YES' : 'NO', column.Field);
    }
    assert.equal(columns[0].Key, 'PRI');
    assert.equal(columns[0].Extra, 'auto_increment');
    const indexes = await sequelize.getQueryInterface().showIndex('upgrades');
    const history = indexes.find(({ name }) => name === 'upgrades_user_id_id');
    assert.ok(history);
    assert.equal(history.unique, false);
    assert.deepEqual(history.fields.map(({ attribute }) => attribute), ['userId', 'id']);
});

test('the upgrade model round-trips every alias, exact prices, a win and a loss', async () => {
    await resetTestDatabase();
    const Upgrade = require('../src/models/upgrade');
    assert.equal(Upgrade.rawAttributes.up_clientSeed.type.toSql(), 'VARCHAR(255)');
    const record = {
        up_userId: 1, up_seedId: 2, up_serverSeedHash: 'a'.repeat(64), up_clientSeed: `c${'\uFE0F'.repeat(254)}`, up_nonce: 7,
        up_stake: JSON.stringify([{ storageId: 10, itemId: 100, color: 'default', price: '12.34' }]),
        up_stakeValue: '12.34', up_targetItemId: 200, up_targetColor: 'painted', up_targetPrice: '24.68',
        up_threshold: 450000, up_roll: 123456, up_won: true, up_resultStorageId: 11,
        up_created_at: new Date('2026-11-23T12:00:00Z'),
    };
    const win = await Upgrade.create(record);
    assert.ok(win.up_id > 0);
    assert.deepEqual((await win.reload()).get({ plain: true }), { up_id: win.up_id, ...record });
    const lossRecord = { ...record, up_nonce: 8, up_roll: 900000, up_won: false, up_resultStorageId: null };
    const loss = await Upgrade.create(lossRecord);
    assert.equal(loss.up_id, win.up_id + 1);
    assert.deepEqual((await loss.reload()).get({ plain: true }), { up_id: loss.up_id, ...lossRecord });
    const [[stored]] = await sequelize.query('SELECT stakeValue, targetPrice, won, resultStorageId FROM upgrades WHERE id = ?', {
        replacements: [win.up_id],
    });
    assert.deepEqual(stored, { stakeValue: '12.34', targetPrice: '24.68', won: 1, resultStorageId: 11 });
    assert.equal(Upgrade.options.timestamps, false);
    assert.equal(Upgrade.getTableName(), 'upgrades');
});

test('the upgrades table migration drops the table and can recreate it', async () => {
    await resetTestDatabase();
    await migrator().down({ migrations: [TABLE_MIGRATION] });
    assert.ok(!(await sequelize.getQueryInterface().showAllTables()).includes('upgrades'));
    assert.ok((await sequelize.getQueryInterface().showAllTables()).includes('storage'));
    await migrator().up();
    assert.ok((await sequelize.getQueryInterface().showAllTables()).includes('upgrades'));
});

test('both migrations describe their down effects and the server registers the upgrade model', () => {
    const cli = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'migrate.js'), 'utf8');
    for (const name of [STATUS_MIGRATION, TABLE_MIGRATION]) {
        assert.ok(cli.includes(`'${name}':`), name);
    }
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.match(server, /require\(['"]\.\/src\/models\/upgrade['"]\)/);
});
