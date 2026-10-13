const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const committedPrices = () => {
    const fs = require('fs');
    const path = require('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'data', 'casePrices.json'), 'utf8'));
};

const quietLog = { log() {}, warn() {}, error: console.error };

const storedPrices = async (sequelize) => {
    const [rows] = await sequelize.query('SELECT id, price FROM cases ORDER BY id');
    return Object.fromEntries(rows.map((row) => [row.id, Number(row.price)]));
};

test('every case is seeded at its price from the committed casePrices.json', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { seedCases } = require('../scripts/seedCases');
    const allCases = require('../src/constant/cases/_all');

    await seedCases({ log: quietLog });

    const prices = committedPrices();
    const expected = Object.fromEntries(Object.keys(allCases).sort().map((id) => [id, prices[id]]));
    assert.deepStrictEqual(await storedPrices(sequelize), expected);
    assert.ok(!Object.values(expected).includes(100), 'no case may carry the old default price');
});

test('a case without a price stops the seed before anything is written, naming the case', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { seedCases } = require('../scripts/seedCases');

    const casePrices = committedPrices();
    delete casePrices.bomj;
    casePrices.zephyr = 0;

    await assert.rejects(
        seedCases({ casePrices, log: quietLog }),
        (error) => /bomj, zephyr/.test(error.message),
    );

    const [[cases]] = await sequelize.query('SELECT COUNT(*) AS n FROM cases');
    const [[categories]] = await sequelize.query('SELECT COUNT(*) AS n FROM categories');
    assert.strictEqual(Number(cases.n), 0);
    assert.strictEqual(Number(categories.n), 0);
});

test('re-pricing clears a sale price that is no longer below the new price and keeps valid ones', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { seedCases } = require('../scripts/seedCases');
    const prices = committedPrices();

    const existing = {
        bomj: [500, 300],
        'chop-shop': [500, prices['chop-shop']],
        havoc: [5000, 1000],
        cobblestone: [5000, 0],
        train: [5000, null],
    };
    for (const [id, [price, discount]] of Object.entries(existing)) {
        await sequelize.query(
            'INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) '
            + "VALUES (?, 'T', ?, ?, 1, 1, 0, 'weapon', 1000)",
            { replacements: [id, price, discount] },
        );
    }
    const warnings = [];

    await seedCases({ log: { ...quietLog, warn: (message) => warnings.push(message) } });

    const [rows] = await sequelize.query(
        "SELECT id, price, discount FROM cases WHERE id IN ('bomj', 'chop-shop', 'havoc', 'cobblestone', 'train') ORDER BY id",
    );
    assert.deepStrictEqual(
        rows.map((row) => [row.id, Number(row.price), row.discount === null ? null : Number(row.discount)]),
        [
            ['bomj', prices.bomj, null],
            ['chop-shop', prices['chop-shop'], null],
            ['cobblestone', prices.cobblestone, 0],
            ['havoc', prices.havoc, 1000],
            ['train', prices.train, null],
        ],
    );
    assert.strictEqual(warnings.length, 2, warnings.join('\n'));
    assert.match(warnings[0], new RegExp(`bomj: sale price 300 is not below the new price ${prices.bomj}`));
    assert.match(warnings[1], new RegExp(`chop-shop: sale price ${prices['chop-shop']} is not below the new price ${prices['chop-shop']}`));
});

test('a missing casePrices.json refuses every case instead of pricing them at a default', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { seedCases } = require('../scripts/seedCases');

    await assert.rejects(
        seedCases({ casePrices: {}, log: quietLog }),
        (error) => /38 of 38 cases/.test(error.message),
    );

    const [[cases]] = await sequelize.query('SELECT COUNT(*) AS n FROM cases');
    assert.strictEqual(Number(cases.n), 0);
});
