const sequelize = require('../src/config/db');
const { createMigrator } = require('../src/db/migrator');
const baselineMigration = require('../migrations/20260922000000-baseline.js');

const BASELINE = '20260922000000-baseline.js';

const deriveBaselineSchema = async () => {
    const schema = [];
    await baselineMigration.up({
        context: {
            createTable: async (name, columns) => {
                schema.push({ table: name, columns: Object.keys(columns) });
            },
            addIndex: async () => {},
        },
    });
    return schema;
};

const DOWN_EFFECTS = {
    '20260922000000-baseline.js': 'drops every table in the schema and all rows in them',
    '20260922000100-money-precision.js':
        'narrows users.balance back to DECIMAL(10,0), users.rank back to DECIMAL(10,0) and '
        + 'balance_history.balanceChange back to INTEGER — MySQL rounds every stored amount to a whole '
        + 'number without warning, so 12.50 becomes 13 and the kopiyky are gone for good',
    '20260922000200-user-unique.js':
        'drops the unique indexes on users.login and users.email and widens email back to TEXT, '
        + 'reopening duplicate registrations',
    '20260922000300-bonus-history-parity.js':
        'removes AUTO_INCREMENT from bonus_history.id and drops the unique index on (userId, bonusId), '
        + 'reopening the double-claim race on bonuses',
    '20260922000400-admin-actions.js':
        'drops the admin_actions table and the entire admin audit trail with it',
    '20260922000500-balance-admin-adjust.js':
        'removes admin_adjust from the balance_history.type ENUM — it refuses while any balance_history row '
        + 'still uses that type, so revert only after those rows are gone',
    '20260922000600-password-resets.js':
        'drops the password_resets table, so every outstanding password reset link stops working',
    '20260922000700-case-open-draw-table.js':
        'drops case_opens.drawTable, so no open recorded since can be verified against the case as it was',
    '20260922000800-one-active-seed.js':
        'drops the one-active-seed-per-user index, so concurrent requests can again create duplicate active seeds; '
        + 'duplicates it revealed while converging stay revealed',
    '20260922000900-user-token-version.js':
        'drops users.tokenVersion, so a password reset stops signing out the sessions opened before it',
    '20260922001000-seed-user-status-index.js':
        'drops the (userId, status) index, so locking the active seed of one user scans and locks the whole seed table again',
    '20260923000000-uah-credit-rate-module.js':
        'deletes the uah-credit-rate module row, including a rate someone set by hand, so every sell pays '
        + 'at the fallback rate of 1',
    '20260923000100-balance-history-reset.js':
        'removes reset from the balance_history.type ENUM — it refuses while any balance_history row still uses '
        + 'that type, and while it is reverted every profile reset fails',
    '20260923000110-user-id-indexes.js':
        'drops the userId indexes on storage, balance_history and case_opens, so every per-player read scans the '
        + "whole table again and a profile reset locks every player's items while it waits",
    '20260930000000-storage-status-updated-index.js':
        'drops the (status, updated_at) index, so the withdrawal sweep scans the whole storage table every 10 seconds',
    '20261013000000-email-verifications.js':
        'drops email_verifications, so every outstanding confirmation link stops working and those registrations are lost',
    '20261013000100-counters-not-null.js':
        'lets cases.openedCount, cases.openLimit, users.balance and users.rank hold NULL again; stored values stay, '
        + 'but a case whose openedCount is NULL is never closed by its open limit and every credit to a NULL balance is refused as a full balance',
    '20261013000200-storage-profile-stats-indexes.js':
        'drops the (userId, caseId) and (userId, itemId, color) indexes on storage, so every view of a public profile '
        + "and its favourite case reads each of the player's drops row by row and groups them in a temporary table again",
    '20261028000000-article-translations.js':
        'drops articles.titleEn and articles.textEn, so every English article text is lost and English pages show the Ukrainian one',
    '20261028000100-site-articles.js':
        'deletes the user agreement, the service rules, the "more credits" page and the contacts (articles 3, 6, 8 and 9) '
        + 'unless their title was changed since, so the footer, menu and registration links show "article not found" again',
    '20261029000000-item-grade.js':
        'drops items.grade, so every item loses its CS2 rarity grade and the site shows items without grade colours '
        + 'until the column is restored and npm run seed fills it again',
};

const status = async (migrator) => {
    const executed = await migrator.executed();
    const pending = await migrator.pending();
    console.log(`Executed (${executed.length}):`);
    executed.forEach((m) => console.log(`  ✓ ${m.name}`));
    console.log(`Pending (${pending.length}):`);
    pending.forEach((m) => console.log(`  · ${m.name}`));
    return pending.length;
};

const findMissingTablesAndColumns = async (names, schema) => {
    const missingTables = schema.map((t) => t.table).filter((t) => !names.includes(t));

    const missingColumns = [];
    for (const { table, columns } of schema) {
        if (missingTables.includes(table)) {
            continue;
        }
        // eslint-disable-next-line no-await-in-loop
        const [cols] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\``);
        const colNames = cols.map((c) => c.Field);
        columns.filter((column) => !colNames.includes(column))
            .forEach((column) => missingColumns.push(`${table}.${column}`));
    }

    return { missingTables, missingColumns };
};

const baselineMark = async (migrator) => {
    const executed = await migrator.executed();
    if (executed.some((m) => m.name === BASELINE)) {
        console.log(`${BASELINE} is already recorded as executed.`);
        return;
    }

    const schema = await deriveBaselineSchema();
    const [tables] = await sequelize.query('SHOW TABLES');
    const names = tables.map((r) => Object.values(r)[0]);
    const { missingTables, missingColumns } = await findMissingTablesAndColumns(names, schema);

    if (missingTables.length > 0 || missingColumns.length > 0) {
        const problems = [];
        if (missingTables.length > 0) {
            problems.push(`missing tables: ${missingTables.join(', ')}`);
        }
        if (missingColumns.length > 0) {
            problems.push(`missing columns: ${missingColumns.join(', ')}`);
        }
        throw new Error(
            `Refusing to mark the baseline: this database does not match the expected schema (${problems.join('; ')}). `
            + 'Run "npm run migrate up" against an empty database instead.',
        );
    }

    console.log(`Found ${names.length} existing tables; recording ${BASELINE} as executed without running it.`);
    await migrator.storage.logMigration({ name: BASELINE, context: sequelize.getQueryInterface() });
    console.log('Done. Now run "npm run migrate up".');
};

const down = async (migrator, { forceDropAll, confirmed }) => {
    const executed = await migrator.executed();
    if (executed.length === 0) {
        console.log('Nothing to revert.');
        return;
    }

    const target = executed[executed.length - 1];
    const effect = DOWN_EFFECTS[target.name] || 'reverts the schema changes it applied';
    console.log(`Target migration: ${target.name}`);
    console.log(`Reverting it ${effect}.`);

    if (target.name === BASELINE) {
        if (!forceDropAll) {
            throw new Error(
                `Refusing to revert ${BASELINE}: this drops every table in the schema and every row in them. `
                + 'Run "npm run migrate:undo -- --force-drop-all" to confirm you intend to destroy the '
                + 'entire schema and its data. The "--" is required; without it npm swallows the flag.',
            );
        }
    } else if (!confirmed) {
        throw new Error(
            `Refusing to revert ${target.name} without confirmation: it ${effect}. `
            + 'Run "npm run migrate:undo -- --yes" if that is what you intend. '
            + 'The "--" is required; without it npm swallows the flag.',
        );
    }

    const reverted = await migrator.down();
    console.log(reverted.length ? `Reverted ${reverted.length} migration(s).` : 'Nothing to revert.');
};

const main = async () => {
    const command = process.argv[2] || 'status';
    const forceDropAll = process.argv.includes('--force-drop-all');
    const confirmed = process.argv.includes('--yes');
    const migrator = createMigrator(sequelize);

    try {
        if (command === 'up') {
            const applied = await migrator.up();
            console.log(applied.length ? `Applied ${applied.length} migration(s).` : 'Nothing to apply.');
        } else if (command === 'down') {
            await down(migrator, { forceDropAll, confirmed });
        } else if (command === 'status') {
            await status(migrator);
        } else if (command === 'baseline-mark') {
            await baselineMark(migrator);
        } else {
            console.error(
                `Unknown command "${command}". Use: up | down [--yes | --force-drop-all] | status | baseline-mark`,
            );
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
