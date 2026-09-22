const sequelize = require('../src/config/db');
const { createMigrator } = require('../src/db/migrator');

const BASELINE = '20260922000000-baseline.js';

const status = async (migrator) => {
    const executed = await migrator.executed();
    const pending = await migrator.pending();
    console.log(`Executed (${executed.length}):`);
    executed.forEach((m) => console.log(`  ✓ ${m.name}`));
    console.log(`Pending (${pending.length}):`);
    pending.forEach((m) => console.log(`  · ${m.name}`));
    return pending.length;
};

const baselineMark = async (migrator) => {
    const executed = await migrator.executed();
    if (executed.some((m) => m.name === BASELINE)) {
        console.log(`${BASELINE} is already recorded as executed.`);
        return;
    }

    const [tables] = await sequelize.query('SHOW TABLES');
    const names = tables.map((r) => Object.values(r)[0]);
    const expected = ['users', 'cases', 'storage', 'items', 'balance_history'];
    const missing = expected.filter((t) => !names.includes(t));
    if (missing.length > 0) {
        throw new Error(
            `Refusing to mark the baseline: this database is missing ${missing.join(', ')}. `
            + 'Run "npm run migrate up" against an empty database instead.',
        );
    }

    console.log(`Found ${names.length} existing tables; recording ${BASELINE} as executed without running it.`);
    await migrator.storage.logMigration({ name: BASELINE, context: sequelize.getQueryInterface() });
    console.log('Done. Now run "npm run migrate up".');
};

const main = async () => {
    const command = process.argv[2] || 'status';
    const migrator = createMigrator(sequelize);

    try {
        if (command === 'up') {
            const applied = await migrator.up();
            console.log(applied.length ? `Applied ${applied.length} migration(s).` : 'Nothing to apply.');
        } else if (command === 'down') {
            const reverted = await migrator.down();
            console.log(reverted.length ? `Reverted ${reverted.length} migration(s).` : 'Nothing to revert.');
        } else if (command === 'status') {
            await status(migrator);
        } else if (command === 'baseline-mark') {
            await baselineMark(migrator);
        } else {
            console.error(`Unknown command "${command}". Use: up | down | status | baseline-mark`);
            process.exitCode = 1;
        }
    } catch (e) {
        console.error(`Migration failed: ${e.message}`);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
};

main();
