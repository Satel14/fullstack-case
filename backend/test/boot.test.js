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
    await createMigrator(sequelize, { quiet: true }).down();

    await assert.rejects(
        () => assertMigrationsApplied(sequelize),
        (e) => e.message.includes('user-unique') && /pending/i.test(e.message),
    );
});
