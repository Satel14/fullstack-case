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

    const [users] = await sequelize.query("SHOW COLUMNS FROM users WHERE Field IN ('balance', 'rank', 'email')");
    const byField = Object.fromEntries(users.map((c) => [c.Field, c]));

    assert.match(byField.balance.Type, /decimal\(10,0\)/i);
    assert.match(byField.rank.Type, /decimal\(10,0\)/i);
    assert.match(byField.email.Type, /text/i);
    assert.strictEqual(byField.email.Key, '');

    const [history] = await sequelize.query("SHOW COLUMNS FROM balance_history WHERE Field = 'balanceChange'");
    assert.match(history[0].Type, /int/i);
});
