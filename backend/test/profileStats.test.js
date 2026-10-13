const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { resetTestDatabase } = require('./helpers/db');
const { createMigrator } = require('../src/db/migrator');

const INDEX_MIGRATION = '20261013000200-storage-profile-stats-indexes.js';
const STATS_INDEXES = {
    storage_user_id_case_id: ['userId', 'caseId'],
    storage_user_id_item_id_color: ['userId', 'itemId', 'color'],
};

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

const answerOf = (handlerName, id) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload: JSON.parse(JSON.stringify(payload)) }); },
    };
    require('../src/controllers/storage')[handlerName]({ params: { id: String(id) } }, res);
});

const countFor = (id) => answerOf('getStorageItemsCountByUserId', id);
const favoriteFor = (id) => answerOf('getFavoriteCaseByUserId', id);

const ITEMS = [
    [100, 'Glock-18 | Sand Dune', 'Factory New', { default: 3, painted: 5 }],
    [200, 'P250 | Sand Dune', 'Minimal Wear', { default: 4, painted: 6 }],
    [300, 'AWP | Worm God', 'Battle Scarred', { default: 300, painted: 2000 }],
    [400, 'Nova | Caged Steel', 'Factory New', { default: 7, painted: 10 }],
];

const fresh = async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('veteran', 'x', 'v@e.ua', 0, 0, 1), "
        + "('rich', 'x', 'r@e.ua', 0, 0, 1), ('newcomer', 'x', 'n@e.ua', 0, 0, 1)",
    );
    for (const [itemId, name, rare, prices] of ITEMS) {
        await sequelize.query(
            "INSERT INTO items (itemId, name, rare, colors, type, imagePath) VALUES (?, ?, ?, '[]', 'rifles', ?)",
            { replacements: [itemId, name, rare, `/img/items/${itemId}.png`] },
        );
        await sequelize.query(
            'INSERT INTO insider_prices (name, pricesInCredits) VALUES (?, JSON_QUOTE(?))',
            { replacements: [name, JSON.stringify(prices)] },
        );
    }
    return sequelize;
};

const addDrops = (sequelize, drops) => sequelize.query(
    `INSERT INTO storage (userId, itemId, color, caseId, status, extraData) VALUES ${drops.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}`,
    { replacements: drops.flatMap((d) => [d.userId, d.itemId, d.color, d.caseId, d.status || 'inventory', d.extraData || null]) },
);

test('a player with more than 200 drops gets unique cases and the best drop over the whole history', async () => {
    const sequelize = await fresh();
    const oldest = [
        {
            userId: 1, itemId: 300, color: 'painted', caseId: 'old-case', status: 'money', extraData: 'trade-link-SECRET',
        },
        ...Array.from({ length: 49 }, () => ({ userId: 1, itemId: 100, color: 'default', caseId: 'retired' })),
    ];
    const newest = Array.from({ length: 220 }, (_, i) => ({
        userId: 1, itemId: i % 2 ? 100 : 200, color: 'default', caseId: 'dust2',
    }));
    await addDrops(sequelize, oldest);
    await addDrops(sequelize, [{
        userId: 2, itemId: 300, color: 'painted', caseId: 'mirage',
    }]);
    await addDrops(sequelize, newest);

    const result = await countFor(1);

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.strictEqual(result.payload.data, 270);
    assert.strictEqual(result.payload.uniqueCases, 3);
    assert.deepStrictEqual(result.payload.bestDrop, { storage_id: 1, storage_itemId: 300, storage_color: 'painted' });
    assert.ok(!JSON.stringify(result.payload).includes('SECRET'));
});

test('the best drop is the most valuable item in its colour, not the rarest wear, and the newest wins a tie', async () => {
    const sequelize = await fresh();
    await addDrops(sequelize, [
        { userId: 1, itemId: 400, color: 'painted', caseId: 'dust2' },
        { userId: 1, itemId: 300, color: 'default', caseId: 'dust2' },
        { userId: 1, itemId: 100, color: 'painted', caseId: 'dust2' },
        { userId: 1, itemId: 300, color: 'default', caseId: 'mirage' },
        { userId: 1, itemId: 9999, color: 'default', caseId: 'mirage' },
    ]);

    const result = await countFor(1);

    assert.strictEqual(result.payload.uniqueCases, 2);
    assert.deepStrictEqual(result.payload.bestDrop, { storage_id: 4, storage_itemId: 300, storage_color: 'default' });
});

test('a player without drops has no unique cases and no best drop', async () => {
    const sequelize = await fresh();
    await addDrops(sequelize, [{
        userId: 1, itemId: 300, color: 'painted', caseId: 'dust2',
    }]);

    const result = await countFor(3);

    assert.deepStrictEqual(
        { data: result.payload.data, uniqueCases: result.payload.uniqueCases, bestDrop: result.payload.bestDrop },
        { data: 0, uniqueCases: 0, bestDrop: null },
    );
});

const storageIndexes = async (sequelize) => Object.fromEntries(
    (await sequelize.getQueryInterface().showIndex('storage')).map((i) => [i.name, i.fields.map((f) => f.attribute)]),
);

test('the migrations index storage by player and case and by player, item and colour, and the revert drops only those', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    const indexes = await storageIndexes(sequelize);
    Object.entries(STATS_INDEXES).forEach(([name, fields]) => assert.deepStrictEqual(indexes[name], fields, name));

    await createMigrator(sequelize, { quiet: true }).down({ to: INDEX_MIGRATION });

    const kept = Object.keys(indexes).filter((name) => !STATS_INDEXES[name]).sort();
    assert.deepStrictEqual(Object.keys(await storageIndexes(sequelize)).sort(), kept);
    const cli = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'migrate.js'), 'utf8');
    assert.ok(cli.includes(`'${INDEX_MIGRATION}':`), 'the revert must name what it costs in DOWN_EFFECTS');
});

const recordQueries = async (sequelize, run) => {
    const recorded = [];
    const { query } = sequelize;
    sequelize.query = function recording(sql, options) {
        recorded.push({ sql, options });
        return query.call(this, sql, options);
    };
    try {
        await run();
    } finally {
        delete sequelize.query;
    }
    return recorded;
};

const manyDrops = () => [1, 2, 3].flatMap((userId) => Array.from({ length: 400 }, (_, i) => ({
    userId,
    itemId: ITEMS[i % ITEMS.length][0],
    color: i % 3 ? 'default' : 'painted',
    caseId: `case-${i % 7}`,
    status: i % 5 ? 'inventory' : 'money',
})));

const assertIndexOnlyStorageReads = async (sequelize, recorded) => {
    const storageReads = recorded.filter(({ sql }) => typeof sql === 'string' && /\bFROM `?storage`?(\s|$)/i.test(sql));
    assert.ok(storageReads.length > 0, 'expected the handler to read storage');
    for (const { sql, options } of storageReads) {
        const [plan] = await sequelize.query(`EXPLAIN ${sql}`, { replacements: options && options.replacements });
        const storageSteps = plan.filter((step) => step.table === 'storage');
        assert.ok(storageSteps.length > 0, sql);
        storageSteps.forEach((step) => {
            const described = `${sql}\n${JSON.stringify(step)}`;
            assert.match(String(step.Extra), /Using index/, described);
            assert.doesNotMatch(String(step.Extra), /Using temporary|Using filesort/, described);
        });
    }
};

test('the profile statistics read storage from its indexes alone, without a temporary table', async () => {
    const sequelize = await fresh();
    await addDrops(sequelize, manyDrops());
    await sequelize.query('ANALYZE TABLE storage');

    let result;
    const recorded = await recordQueries(sequelize, async () => { result = await countFor(1); });

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.deepStrictEqual(
        { data: result.payload.data, uniqueCases: result.payload.uniqueCases, bestDrop: result.payload.bestDrop },
        { data: 400, uniqueCases: 7, bestDrop: { storage_id: 391, storage_itemId: 300, storage_color: 'painted' } },
    );
    await assertIndexOnlyStorageReads(sequelize, recorded);
});

const addCases = (sequelize, ids) => sequelize.query(
    'INSERT INTO cases (id, title, price, discount, categoryId, published, img, openedCount, type, openLimit) VALUES '
    + ids.map(() => "(?, ?, 100, 0, 1, 1, '', 0, 'weapon', 1000)").join(', '),
    { replacements: ids.flatMap((id) => [id, id.toUpperCase()]) },
);

const dropsOf = (userId, caseIds) => caseIds.map((caseId) => ({
    userId, itemId: 100, color: 'default', caseId,
}));

const caseAnswer = async (id) => ({
    status: 200,
    data: JSON.parse(JSON.stringify(await require('../src/services/case').getCaseById(id))),
});

test('the favourite case counts the whole history, not just the newest 1000 drops', async () => {
    const sequelize = await fresh();
    await addCases(sequelize, ['dust2', 'mirage', 'nuke']);
    await addDrops(sequelize, dropsOf(1, Array(700).fill('mirage')));
    await addDrops(sequelize, dropsOf(1, [...Array(600).fill('dust2'), ...Array(400).fill('nuke')]));

    const result = await favoriteFor(1);

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.deepStrictEqual(result.payload, await caseAnswer('mirage'));
});

test('a tie for the favourite case goes to the case dropped most recently, and no drops means no favourite', async () => {
    const sequelize = await fresh();
    await addCases(sequelize, ['dust2', 'nuke']);
    await addDrops(sequelize, dropsOf(1, ['dust2', 'nuke', 'nuke', 'dust2']));
    await addDrops(sequelize, dropsOf(2, ['nuke', 'dust2', 'dust2', 'nuke']));

    assert.deepStrictEqual((await favoriteFor(1)).payload, await caseAnswer('dust2'));
    assert.deepStrictEqual((await favoriteFor(2)).payload, await caseAnswer('nuke'));
    assert.deepStrictEqual(await favoriteFor(3), { code: 200, payload: { status: 200, data: null } });
});

test('the favourite case reads storage from its index alone, without a temporary table', async () => {
    const sequelize = await fresh();
    await addCases(sequelize, Array.from({ length: 7 }, (_, i) => `case-${i}`));
    await addDrops(sequelize, manyDrops());
    await sequelize.query('ANALYZE TABLE storage');

    let result;
    const recorded = await recordQueries(sequelize, async () => { result = await favoriteFor(1); });

    assert.deepStrictEqual(result.payload, await caseAnswer('case-0'));
    await assertIndexOnlyStorageReads(sequelize, recorded);
});
