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

test('re-pricing only changes the price of the cases already in the database', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { repriceCases } = require('../scripts/seedCases');
    const prices = committedPrices();
    const rows = [
        ['bomj', 'Custom bomj', 500, prices.bomj + 1, 0, 42, 77, '/img/case/custom.png'],
        ['havoc', 'Havoc', 99999, 1, 1, 7, 1000, '/img/case/12havoc.png'],
        ['nocode', 'No code', 10, null, 1, 3, 1000, '/img/case/nocode.png'],
    ];
    for (const [id, title, price, discount, published, openedCount, openLimit, img] of rows) {
        await sequelize.query(
            'INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit, img) '
            + "VALUES (?, ?, ?, ?, 1, ?, ?, 'weapon', ?, ?)",
            { replacements: [id, title, price, discount, published, openedCount, openLimit, img] },
        );
    }

    const result = await repriceCases({ log: quietLog });

    const [stored] = await sequelize.query('SELECT id, title, price, discount, published, openedCount, openLimit, img FROM cases ORDER BY id');
    assert.deepStrictEqual(stored.map((row) => ({
        ...row, price: Number(row.price), discount: row.discount === null ? null : Number(row.discount),
    })), [
        {
            id: 'bomj', title: 'Custom bomj', price: prices.bomj, discount: null, published: 0, openedCount: 42, openLimit: 77, img: '/img/case/custom.png',
        },
        {
            id: 'havoc', title: 'Havoc', price: prices.havoc, discount: 1, published: 1, openedCount: 7, openLimit: 1000, img: '/img/case/12havoc.png',
        },
        {
            id: 'nocode', title: 'No code', price: 10, discount: null, published: 1, openedCount: 3, openLimit: 1000, img: '/img/case/nocode.png',
        },
    ]);
    assert.deepStrictEqual(result, { repriced: 2 });
});

test('re-pricing refuses a case without a price before changing anything', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { repriceCases } = require('../scripts/seedCases');
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES ('havoc', 'Havoc', 99999, null, 1, 1, 0, 'weapon', 1000)",
    );
    const casePrices = committedPrices();
    delete casePrices.bomj;

    await assert.rejects(repriceCases({ casePrices, log: quietLog }), /bomj/);
    const [[row]] = await sequelize.query("SELECT price FROM cases WHERE id = 'havoc'");
    assert.strictEqual(Number(row.price), 99999);
});

test('re-pricing again changes nothing, and a case without a price gets one', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { repriceCases } = require('../scripts/seedCases');
    const prices = committedPrices();
    await sequelize.query(
        'INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) '
        + "VALUES ('bomj', 'T', NULL, NULL, 1, 1, 0, 'weapon', 1000), ('havoc', 'T', 5, NULL, 1, 1, 0, 'weapon', 1000)",
    );

    assert.deepStrictEqual(await repriceCases({ log: quietLog }), { repriced: 2 });
    assert.deepStrictEqual(await storedPrices(sequelize), { bomj: prices.bomj, havoc: prices.havoc });
    assert.deepStrictEqual(await repriceCases({ log: quietLog }), { repriced: 0 });
});

test('the seed script refuses an argument it does not know instead of running the full seed', async () => {
    const { spawnSync } = require('child_process');
    const path = require('path');
    const { TEST_DB } = require('./helpers/db');
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        'INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) '
        + "VALUES ('bomj', 'Kept', 500, NULL, 1, 0, 42, 'weapon', 77)",
    );

    const run = spawnSync(process.execPath, [path.join('scripts', 'seedCases.js'), '--price-only'], {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'development', DB_NAME: TEST_DB },
    });

    assert.strictEqual(run.status, 1, `${run.stdout}${run.stderr}`);
    assert.match(`${run.stdout}${run.stderr}`, /--price-only/);
    const [rows] = await sequelize.query('SELECT id, title, price, published, openedCount, openLimit FROM cases');
    assert.deepStrictEqual(rows.map((row) => ({ ...row, price: Number(row.price) })), [{
        id: 'bomj', title: 'Kept', price: 500, published: 0, openedCount: 42, openLimit: 77,
    }]);
});
