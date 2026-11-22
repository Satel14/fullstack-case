const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase, recreateTestDatabase, TEST_DB } = require('./helpers/db');
const { createMigrator } = require('../src/db/migrator');
const { CATEGORIES, COLLECTION_IDS, catalogue } = require('../scripts/lib/caseCatalog');

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

test('the full seed writes catalogue categories and case metadata at the committed prices', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { seedCases } = require('../scripts/seedCases');
    const allCases = require('../src/constant/cases/_all');

    await seedCases({ log: quietLog });

    const prices = committedPrices();
    const expected = Object.fromEntries(Object.keys(allCases).sort().map((id) => [id, prices[id]]));
    assert.deepStrictEqual(await storedPrices(sequelize), expected);
    assert.ok(!Object.values(expected).includes(100), 'no case may carry the old default price');
    const [categories] = await sequelize.query('SELECT id, slug, title, priority, published FROM categories ORDER BY priority DESC');
    assert.deepStrictEqual(categories, CATEGORIES.map((category) => ({ ...category, published: 1 })));
    const [cases] = await sequelize.query('SELECT * FROM cases ORDER BY id');
    const entries = new Map(catalogue().map((entry) => [entry.id, entry]));
    cases.forEach((row) => {
        const entry = entries.get(row.id);
        assert.deepStrictEqual(row, {
            id: entry.id,
            title: entry.title,
            price: prices[entry.id],
            discount: null,
            categoryId: CATEGORIES.find(({ slug }) => slug === entry.category).id,
            published: 1,
            img: entry.image,
            openedCount: 0,
            type: 'weapon',
            openLimit: entry.openLimit,
        }, entry.id);
    });
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
        (error) => /74 of 74 cases/.test(error.message),
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

test('the seed script refuses unknown, combined and repeated flags without changing rows', async () => {
    const { spawnSync } = require('child_process');
    const path = require('path');
    const { TEST_DB } = require('./helpers/db');
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        'INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) '
        + "VALUES ('bomj', 'Kept', 500, NULL, 1, 0, 42, 'weapon', 77)",
    );

    for (const args of [
        ['--price-only'], ['--bogus'], ['--add-new', '--prices-only'],
        ['--add-new', '--add-new'], ['--prices-only', '--prices-only'],
    ]) {
        const run = spawnSync(process.execPath, [path.join('scripts', 'seedCases.js'), ...args], {
            cwd: path.join(__dirname, '..'),
            encoding: 'utf8',
            env: { ...process.env, NODE_ENV: 'development', DB_NAME: TEST_DB },
        });
        const output = `${run.stdout}${run.stderr}`;
        assert.strictEqual(run.status, 1, output);
        assert.ok(output.includes(args.join(' ')), output);
        assert.match(output, /--prices-only/);
        assert.match(output, /--add-new/);
    }
    const [rows] = await sequelize.query('SELECT id, title, price, published, openedCount, openLimit FROM cases');
    assert.deepStrictEqual(rows.map((row) => ({ ...row, price: Number(row.price) })), [{
        id: 'bomj', title: 'Kept', price: 500, published: 0, openedCount: 42, openLimit: 77,
    }]);
});

const storedRows = async (sequelize) => {
    const [categories] = await sequelize.query('SELECT * FROM categories ORDER BY id');
    const [cases] = await sequelize.query('SELECT * FROM cases ORDER BY id');
    return { categories, cases };
};

const withoutUpdates = async (sequelize, run) => {
    const queries = [];
    const previous = sequelize.options.logging;
    sequelize.options.logging = (sql) => queries.push(sql);
    try {
        const result = await run();
        assert.deepStrictEqual(queries.filter((sql) => (
            /\bUPDATE\s+`?(?:cases|categories)`?\b/i.test(sql) || /\bON DUPLICATE KEY UPDATE\b/i.test(sql)
        )), []);
        return result;
    } finally {
        sequelize.options.logging = previous;
    }
};

test('addNewCases restores four categories and 36 cases without updating existing rows, and is idempotent', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { seedCases, addNewCases } = require('../scripts/seedCases');
    assert.strictEqual(typeof addNewCases, 'function');
    await seedCases({ log: quietLog });
    const fresh = await storedRows(sequelize);
    const newIds = catalogue().filter(({ family }) => family !== 'collection').map(({ id }) => id);
    await sequelize.query('DELETE FROM cases WHERE id IN (:ids)', { replacements: { ids: newIds } });
    await sequelize.query('DELETE FROM categories WHERE id IN (4, 5, 6, 7)');
    await sequelize.query(
        "UPDATE categories SET slug = 'custom-collections', title = 'Kept collections', priority = 31, published = 0, titleHelp = 'Kept help' WHERE id = 1",
    );
    await sequelize.query("INSERT INTO categories (id, title, priority, published) VALUES (2, 'Legacy category', 19, 1)");
    await sequelize.query(
        "UPDATE cases SET openedCount = 42, published = 0, openLimit = 77, price = 500, discount = 600, title = 'Kept case', categoryId = 2, img = '/img/case/custom.png', type = 'souvenir' WHERE id = 'bomj'",
    );
    await sequelize.query("INSERT INTO cases (id, title, price, categoryId, published) VALUES ('nocode', 'Kept custom case', 11, 2, 0)");
    const before = await storedRows(sequelize);
    assert.strictEqual(before.cases.filter(({ id }) => COLLECTION_IDS.includes(id)).length, 38);
    const messages = [];
    const options = { log: { ...quietLog, log: (line) => messages.push(line) } };

    assert.deepStrictEqual(await withoutUpdates(sequelize, () => addNewCases(options)), { categories: 4, cases: 36 });

    const after = await storedRows(sequelize);
    assert.deepStrictEqual(after.categories.filter(({ id }) => before.categories.some((row) => row.id === id)), before.categories);
    assert.deepStrictEqual(after.cases.filter(({ id }) => before.cases.some((row) => row.id === id)), before.cases);
    assert.deepStrictEqual(after.categories.filter(({ id }) => id >= 4), fresh.categories.filter(({ id }) => id >= 4));
    assert.deepStrictEqual(after.cases.filter(({ id }) => newIds.includes(id)), fresh.cases.filter(({ id }) => newIds.includes(id)));
    await sequelize.query(
        "UPDATE categories SET slug = 'custom-weapons', title = 'Kept weapons', priority = 41, published = 0, titleHelp = 'Custom help' WHERE id = 4",
    );
    const settled = await storedRows(sequelize);

    assert.deepStrictEqual(await withoutUpdates(sequelize, () => addNewCases(options)), { categories: 0, cases: 0 });
    assert.deepStrictEqual(await storedRows(sequelize), settled);
    assert.deepStrictEqual(messages, [
        '✓ Added 4 categories and 36 cases; existing rows were left as they were',
        '✓ Added 0 categories and 0 cases; existing rows were left as they were',
    ]);
});

test('addNewCases requires migrations before validating prices or writing rows', async () => {
    const sequelize = await recreateTestDatabase();
    activeSequelize = sequelize;
    await createMigrator(sequelize, { quiet: true }).up({ to: '20261118000200-admin-stats-indexes.js' });
    const { addNewCases } = require('../scripts/seedCases');
    await assert.rejects(
        () => addNewCases({ casePrices: {}, log: quietLog }),
        /pending migration.*20261122000100-case-categories\.js/,
    );
    assert.deepStrictEqual(await storedRows(sequelize), { categories: [], cases: [] });
});

test('addNewCases refuses a missing case price before inserting any categories or cases', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { addNewCases } = require('../scripts/seedCases');
    const casePrices = committedPrices();
    delete casePrices['ak-47'];
    await assert.rejects(() => addNewCases({ casePrices, log: quietLog }), /ak-47/);
    assert.deepStrictEqual(await storedRows(sequelize), { categories: [], cases: [] });
});

test('the --add-new CLI inserts missing rows and reports zero additions on its next run', async () => {
    const { spawnSync } = require('child_process');
    const path = require('path');
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const run = () => spawnSync(process.execPath, [path.join('scripts', 'seedCases.js'), '--add-new'], {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'development', DB_NAME: TEST_DB },
    });

    const first = run();
    assert.strictEqual(first.status, 0, `${first.stdout}${first.stderr}`);
    assert.match(first.stdout, /Added 5 categories and 74 cases; existing rows were left as they were/);
    assert.deepStrictEqual(await storedPrices(sequelize), committedPrices());
    const before = await storedRows(sequelize);
    assert.strictEqual(before.categories.length, 5);
    const second = run();
    assert.strictEqual(second.status, 0, `${second.stdout}${second.stderr}`);
    assert.match(second.stdout, /Added 0 categories and 0 cases; existing rows were left as they were/);
    assert.deepStrictEqual(await storedRows(sequelize), before);
});
