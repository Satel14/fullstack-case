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
