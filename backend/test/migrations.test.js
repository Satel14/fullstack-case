const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

test('migrations create every expected table', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const [rows] = await sequelize.query('SHOW TABLES');
    const tables = rows.map((r) => String(Object.values(r)[0]).toLowerCase()).sort();

    assert.deepStrictEqual(tables, [
        'articles',
        'balance_history',
        'bonus_history',
        'case_opens',
        'cases',
        'categories',
        'insider_prices',
        'items',
        'modules',
        'promocodes',
        'provably_fair_seeds',
        'sequelizemeta',
        'storage',
        'users',
    ]);
});

test('baseline snapshots the schema including its current defects', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const migrator = require('../src/db/migrator').createMigrator(sequelize, { quiet: true });
    await migrator.down({ to: 0 });
    await migrator.up({ to: '20260922000000-baseline.js' });

    const [users] = await sequelize.query("SHOW COLUMNS FROM users WHERE Field IN ('balance', 'rank', 'email', 'login')");
    const byField = Object.fromEntries(users.map((c) => [c.Field, c]));

    assert.match(byField.balance.Type, /decimal\(10,0\)/i);
    assert.match(byField.rank.Type, /decimal\(10,0\)/i);
    assert.match(byField.email.Type, /text/i);
    assert.strictEqual(byField.email.Key, '');
    assert.strictEqual(byField.login.Key, '');

    const [history] = await sequelize.query("SHOW COLUMNS FROM balance_history WHERE Field = 'balanceChange'");
    assert.match(history[0].Type, /int/i);
});

test('money columns end up with full precision', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    const [users] = await sequelize.query("SHOW COLUMNS FROM users WHERE Field IN ('balance', 'rank')");
    const byField = Object.fromEntries(users.map((c) => [c.Field, c]));
    assert.match(byField.balance.Type, /decimal\(12,2\)/i);
    assert.match(byField.rank.Type, /decimal\(16,6\)/i);

    const [history] = await sequelize.query("SHOW COLUMNS FROM balance_history WHERE Field = 'balanceChange'");
    assert.match(history[0].Type, /decimal\(12,2\)/i);
});

test('fractional currency survives a round trip', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query("INSERT INTO users (login, email, balance, `rank`, role) VALUES ('kopiyka', 'k@e.ua', 12.50, 0.123456, 1)");
    const [rows] = await sequelize.query("SELECT balance, `rank` FROM users WHERE login = 'kopiyka'");

    assert.strictEqual(Number(rows[0].balance), 12.5);
    assert.strictEqual(Number(rows[0].rank), 0.123456);
});

test('login and email are unique after migration', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    const [email] = await sequelize.query("SHOW COLUMNS FROM users WHERE Field = 'email'");
    assert.match(email[0].Type, /varchar\(255\)/i);

    const isDuplicateEntry = (e) => e.name === 'SequelizeUniqueConstraintError'
        && /Duplicate entry/i.test(e.parent?.message ?? '');

    await sequelize.query("INSERT INTO users (login, email, role) VALUES ('dup', 'dup@e.ua', 1)");
    await assert.rejects(
        () => sequelize.query("INSERT INTO users (login, email, role) VALUES ('dup', 'other@e.ua', 1)"),
        isDuplicateEntry,
    );
    await assert.rejects(
        () => sequelize.query("INSERT INTO users (login, email, role) VALUES ('other', 'dup@e.ua', 1)"),
        isDuplicateEntry,
    );
});

test('uniqueness migration refuses to run when duplicates exist', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { createMigrator } = require('../src/db/migrator');
    const migrator = createMigrator(sequelize, { quiet: true });

    await migrator.down();
    await sequelize.query("INSERT INTO users (login, email, role) VALUES ('same', 'a@e.ua', 1)");
    await sequelize.query("INSERT INTO users (login, email, role) VALUES ('same', 'b@e.ua', 1)");

    await assert.rejects(() => migrator.up(), /duplicate login/i);
});
