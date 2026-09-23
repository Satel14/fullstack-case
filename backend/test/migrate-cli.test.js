const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const mysql = require('mysql2/promise');
const {
    resetTestDatabase, recreateTestDatabase, recreateScratchDatabase, dropScratchDatabase, TEST_DB,
} = require('./helpers/db');
const config = require('../src/config/serverConfig');
const { knownMigrationNames } = require('../src/db/migrator');

const BACKEND_ROOT = path.join(__dirname, '..');
const CLI = path.join('scripts', 'migrate.js');
const BASELINE = '20260922000000-baseline.js';
const DUMP = 'E:/React-projects/case-db-backup-2026-09-22.sql';
const DUMP_DB = `${TEST_DB}_dump`;

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const runCli = (args, database = TEST_DB) => {
    const result = spawnSync(process.execPath, [CLI, ...args], {
        cwd: BACKEND_ROOT,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'development', DB_NAME: database },
    });
    return { code: result.status, output: `${result.stdout}${result.stderr}` };
};

const adminConnection = (database) => mysql.createConnection({
    host: config.database.host,
    port: config.database.db_port,
    user: config.database.username,
    password: String(config.database.password),
    database,
    multipleStatements: false,
});

test('baseline-mark refuses when tables are missing, naming all of them', async () => {
    activeSequelize = await recreateTestDatabase();

    const { code, output } = runCli(['baseline-mark']);

    assert.strictEqual(code, 1);
    assert.match(output, /Refusing to mark the baseline/);
    ['articles', 'balance_history', 'bonus_history', 'case_opens', 'cases', 'categories',
        'insider_prices', 'items', 'modules', 'promocodes', 'provably_fair_seeds', 'storage', 'users']
        .forEach((table) => assert.match(output, new RegExp(`\\b${table}\\b`), `${table} should be named`));
});

test('baseline-mark refuses when a column is missing, naming it', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query('DELETE FROM SequelizeMeta');
    await sequelize.query('ALTER TABLE users DROP COLUMN `rank`');

    const { code, output } = runCli(['baseline-mark']);

    assert.strictEqual(code, 1);
    assert.match(output, /Refusing to mark the baseline/);
    assert.match(output, /missing columns: users\.rank/);
});

test('baseline-mark records the baseline without running it', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query('DELETE FROM SequelizeMeta');
    await sequelize.query('INSERT INTO users (login, email, role) VALUES (\'kept\', \'kept@e.ua\', 1)');

    const { code, output } = runCli(['baseline-mark']);

    assert.strictEqual(code, 0);
    assert.match(output, /recording 20260922000000-baseline\.js as executed without running it/);

    const [meta] = await sequelize.query('SELECT name FROM SequelizeMeta');
    assert.deepStrictEqual(meta.map((r) => r.name), [BASELINE]);

    const [users] = await sequelize.query('SELECT login FROM users');
    assert.deepStrictEqual(users.map((r) => r.login), ['kept']);
});

test('baseline-mark is a no-op when the baseline is already recorded', async () => {
    activeSequelize = await resetTestDatabase();

    const { code, output } = runCli(['baseline-mark']);

    assert.strictEqual(code, 0);
    assert.match(output, /already recorded as executed/);
});

test('down refuses an ordinary revert without --yes and names what it would do', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "DELETE FROM SequelizeMeta WHERE name > '20260922000300-bonus-history-parity.js'",
    );

    const { code, output } = runCli(['down']);

    assert.strictEqual(code, 1);
    assert.match(output, /Refusing to revert 20260922000300-bonus-history-parity\.js without confirmation/);
    assert.match(output, /npm run migrate:undo -- --yes/);

    const [meta] = await sequelize.query('SELECT name FROM SequelizeMeta');
    assert.strictEqual(meta.length, 4);
});

test('down warns that reverting money-precision rounds every stored amount away', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "DELETE FROM SequelizeMeta WHERE name > '20260922000100-money-precision.js'",
    );

    const { code, output } = runCli(['down']);

    assert.strictEqual(code, 1);
    assert.match(output, /20260922000100-money-precision\.js/);
    assert.match(output, /12\.50 becomes 13/);
});

test('down reverts an ordinary migration once --yes is passed', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "DELETE FROM SequelizeMeta WHERE name > '20260922000300-bonus-history-parity.js'",
    );

    const { code, output } = runCli(['down', '--yes']);

    assert.strictEqual(code, 0);
    assert.match(output, /Target migration: 20260922000300-bonus-history-parity\.js/);
    assert.match(output, /Reverted 1 migration\(s\)/);

    const [meta] = await sequelize.query('SELECT name FROM SequelizeMeta');
    assert.strictEqual(meta.length, 3);
});

test('down refuses the baseline even with --yes, and names the working command', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(`DELETE FROM SequelizeMeta WHERE name <> '${BASELINE}'`);

    const { code, output } = runCli(['down', '--yes']);

    assert.strictEqual(code, 1);
    assert.match(output, /Refusing to revert 20260922000000-baseline\.js/);
    assert.match(output, /npm run migrate:undo -- --force-drop-all/);

    const [tables] = await sequelize.query('SHOW TABLES');
    assert.ok(tables.length > 1, 'no table should have been dropped');
});

const schemaStatementsFromDump = (file) => {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const statements = [];
    let buffer = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (buffer.length === 0) {
            const skip = trimmed === ''
                || trimmed.startsWith('--')
                || trimmed.startsWith('/*!')
                || trimmed.startsWith('INSERT INTO')
                || trimmed.startsWith('LOCK TABLES')
                || trimmed.startsWith('UNLOCK TABLES')
                || trimmed.startsWith('CREATE DATABASE')
                || trimmed.startsWith('USE ');
            if (skip) {
                continue;
            }
        }
        buffer.push(line);
        if (trimmed.endsWith(';')) {
            statements.push(buffer.join('\n').trim().replace(/;$/, ''));
            buffer = [];
        }
    }

    return statements;
};

const columnFingerprint = async (connection, schema) => {
    const [rows] = await connection.query(
        `SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION, COLUMN_DEFAULT, IS_NULLABLE,
                COLUMN_TYPE, COLUMN_KEY, EXTRA, COLLATION_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ?
         ORDER BY TABLE_NAME, ORDINAL_POSITION`,
        [schema],
    );
    return rows.map((r) => JSON.stringify(r));
};

const indexFingerprint = async (connection, schema) => {
    const [rows] = await connection.query(
        `SELECT TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME, NON_UNIQUE, INDEX_TYPE, NULLABLE
         FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = ?
         ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
        [schema],
    );
    return rows.map((r) => JSON.stringify(r));
};

test('a baseline-marked live schema and a chain built from empty converge', async (t) => {
    if (!fs.existsSync(DUMP)) {
        t.skip(`pre-work dump not found at ${DUMP}`);
        return;
    }

    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    await recreateScratchDatabase(DUMP_DB);
    const loader = await adminConnection(DUMP_DB);
    const statements = schemaStatementsFromDump(DUMP);
    assert.ok(
        statements.filter((s) => /^CREATE TABLE/i.test(s)).length === 13,
        `expected 13 CREATE TABLE statements in the dump, got ${statements.filter((s) => /^CREATE TABLE/i.test(s)).length}`,
    );
    for (const statement of statements) {
        // eslint-disable-next-line no-await-in-loop
        await loader.query(statement);
    }
    await loader.end();

    const marked = runCli(['baseline-mark'], DUMP_DB);
    assert.strictEqual(marked.code, 0, marked.output);
    const upgraded = runCli(['up'], DUMP_DB);
    assert.strictEqual(upgraded.code, 0, upgraded.output);

    const metaReader = await adminConnection(DUMP_DB);
    const [meta] = await metaReader.query('SELECT name FROM SequelizeMeta ORDER BY name');
    await metaReader.end();
    assert.deepStrictEqual(meta.map((r) => r.name), knownMigrationNames().sort());

    const inspector = await adminConnection('information_schema');
    const [fromEmptyColumns, fromDumpColumns] = await Promise.all([
        columnFingerprint(inspector, TEST_DB),
        columnFingerprint(inspector, DUMP_DB),
    ]);
    const [fromEmptyIndexes, fromDumpIndexes] = await Promise.all([
        indexFingerprint(inspector, TEST_DB),
        indexFingerprint(inspector, DUMP_DB),
    ]);
    await inspector.end();

    assert.deepStrictEqual(fromDumpColumns, fromEmptyColumns);
    assert.deepStrictEqual(fromDumpIndexes, fromEmptyIndexes);

    await dropScratchDatabase(DUMP_DB);
});
