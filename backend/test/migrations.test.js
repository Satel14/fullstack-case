const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');

test('migrations create every expected table', async () => {
    const sequelize = await resetTestDatabase();
    const [rows] = await sequelize.query('SHOW TABLES');
    const tables = rows.map((r) => Object.values(r)[0]).sort();

    assert.deepStrictEqual(tables, [
        'SequelizeMeta',
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
        'storage',
        'users',
    ]);

    await sequelize.close();
});
