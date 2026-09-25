const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { resetTestDatabase, recreateTestDatabase, TEST_DB } = require('./helpers/db');
const { createMigrator } = require('../src/db/migrator');

const MIGRATION = '20260923000000-uah-credit-rate-module.js';

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const modules = async (sequelize) => {
    const [rows] = await sequelize.query(
        'SELECT param, status, CAST(extraData AS CHAR) AS extraData FROM modules ORDER BY param',
    );
    return rows.map((r) => [r.param, Number(r.status), r.extraData]);
};

test('a database built by the migrations has the uah-credit-rate module at rate 1', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    assert.deepStrictEqual(await modules(sequelize), [['uah-credit-rate', 1, '1']]);
});

test('the uah-credit-rate migration keeps a rate an operator already set', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const migrator = require('../src/db/migrator').createMigrator(sequelize, { quiet: true });

    await migrator.down({ to: MIGRATION });
    await sequelize.query("INSERT INTO modules (param, status, extraData) VALUES ('uah-credit-rate', 1, '1.25')");
    await migrator.up();

    assert.deepStrictEqual(await modules(sequelize), [['uah-credit-rate', 1, '1.25']]);
});

test('reverting the uah-credit-rate migration removes only that module row', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const migrator = require('../src/db/migrator').createMigrator(sequelize, { quiet: true });
    await sequelize.query("INSERT INTO modules (param, status, extraData) VALUES ('bonusList', 1, '[]')");

    await migrator.down({ to: MIGRATION });

    assert.deepStrictEqual(await modules(sequelize), [['bonusList', 1, '[]']]);
});

test('the migrate CLI names what reverting the uah-credit-rate migration does and asks to confirm', async () => {
    const sequelize = await recreateTestDatabase();
    await createMigrator(sequelize, { quiet: true }).up({ to: MIGRATION });
    activeSequelize = sequelize;

    const result = spawnSync(process.execPath, [path.join('scripts', 'migrate.js'), 'down'], {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'development', DB_NAME: TEST_DB },
    });
    const output = `${result.stdout}${result.stderr}`;

    assert.strictEqual(result.status, 1, output);
    assert.match(output, /Refusing to revert 20260923000000-uah-credit-rate-module\.js without confirmation/);
    assert.match(output, /fallback rate of 1/);
    assert.deepStrictEqual(await modules(sequelize), [['uah-credit-rate', 1, '1']]);
});
