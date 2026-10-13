const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');

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

const countFor = (id) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    require('../src/controllers/storage').getStorageItemsCountByUserId({ params: { id: String(id) } }, res);
});

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
