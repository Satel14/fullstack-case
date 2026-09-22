const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');
const { createMigrator, assertMigrationsApplied } = require('../src/db/migrator');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

test('assertMigrationsApplied resolves when the chain is complete', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await assert.doesNotReject(() => assertMigrationsApplied(sequelize));
});

test('assertMigrationsApplied rejects and names what is pending', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const migrator = createMigrator(sequelize, { quiet: true });
    await migrator.down();
    await migrator.down();

    await assert.rejects(
        () => assertMigrationsApplied(sequelize),
        (e) => e.message.includes('user-unique')
            && e.message.includes('bonus-history-parity')
            && /pending/i.test(e.message),
    );
});

test('assertMigrationsApplied rejects when the database is ahead of the build', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query("INSERT INTO SequelizeMeta (name) VALUES ('20261231000000-from-the-future.js')");

    await assert.rejects(
        () => assertMigrationsApplied(sequelize),
        (e) => e.message.includes('20261231000000-from-the-future.js')
            && /does not know about/i.test(e.message),
    );
});

test('assertMigrationsApplied names every unknown executed migration', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO SequelizeMeta (name) VALUES ('20261231000000-alpha.js'), ('20270101000000-beta.js')",
    );

    await assert.rejects(
        () => assertMigrationsApplied(sequelize),
        (e) => /2 migration\(s\)/.test(e.message)
            && e.message.includes('20261231000000-alpha.js')
            && e.message.includes('20270101000000-beta.js'),
    );
});
