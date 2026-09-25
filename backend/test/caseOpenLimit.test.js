const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const respond = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler(req, res);
});

const stubItemCache = (caseDef) => {
    const itemHash = {};
    caseDef.ITEMS.forEach((item, i) => {
        itemHash[item.id] = JSON.stringify({
            name: `Item ${item.id}`,
            type: 'rifles',
            rare: item.rare,
            item_imagePath: `/img/${item.id}.png`,
            pricesInCredits: JSON.stringify({ default: 10 + i, painted: 20 + i }),
        });
    });
    const managerPath = require.resolve('../src/redis/manager');
    require.cache[managerPath] = {
        id: managerPath,
        filename: managerPath,
        loaded: true,
        exports: { getAllDataHashWithKey: async () => itemHash },
    };
};

const setup = async ({
    players, openLimit, openedCount = 0, balance = 10000,
}) => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    for (let i = 1; i <= players; i += 1) {
        await sequelize.query(
            "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES (?, 'x', ?, ?, 0, 1)",
            { replacements: [`player${i}`, `player${i}@e.ua`, balance] },
        );
    }
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES "
        + "('dust2', 'DUST2', 100, 0, 1, 1, ?, 'weapon', ?)",
        { replacements: [openedCount, openLimit] },
    );
    const allCases = require('../src/constant/cases/_all');
    stubItemCache(allCases.dust2);
    return sequelize;
};

const openAtOnce = async (requests) => {
    const CaseController = require('../src/controllers/case');
    const opens = requests.map(({ userId, count }) => respond(CaseController.openCaseById, {
        body: { id: 'dust2', count },
        user: { profile: { user_id: userId } },
    }));
    return Promise.race([
        Promise.all(opens),
        new Promise((_, reject) => setTimeout(() => reject(new Error('concurrent opens did not finish within 20s')), 20000)),
    ]);
};

const caseRow = async (sequelize) => {
    const [[row]] = await sequelize.query("SELECT openedCount, published FROM cases WHERE id = 'dust2'");
    return { openedCount: Number(row.openedCount), published: Number(row.published) };
};

const countRows = async (sequelize, table) => {
    const [[row]] = await sequelize.query(`SELECT COUNT(*) AS n FROM ${table}`);
    return Number(row.n);
};

const assertRefusedForLimit = (result) => {
    const MESSAGE = require('../src/constant/responseMessages');
    assert.strictEqual(result.code, 422, JSON.stringify(result.payload));
    assert.ok(
        [MESSAGE.CASE.LIMIT_EXCEEDED, MESSAGE.CASE.NOT_PUBLISHED].includes(result.payload.message),
        JSON.stringify(result.payload),
    );
};

test('players racing for the last open of a limited case get exactly one open', async () => {
    const sequelize = await setup({ players: 3, openLimit: 1 });

    const results = await openAtOnce([1, 2, 3].map((userId) => ({ userId, count: 1 })));

    const won = results.filter((r) => r.code === 200 && r.payload.data);
    assert.strictEqual(won.length, 1, JSON.stringify(results.map((r) => [r.code, r.payload.message])));
    results.filter((r) => !(r.code === 200 && r.payload.data)).forEach(assertRefusedForLimit);

    assert.deepStrictEqual(await caseRow(sequelize), { openedCount: 1, published: 0 });
    assert.strictEqual(await countRows(sequelize, 'case_opens'), 1);
    assert.strictEqual(await countRows(sequelize, 'storage'), 1);

    const [balances] = await sequelize.query('SELECT balance FROM users ORDER BY id');
    const spent = balances.reduce((sum, row) => sum + (10000 - Number(row.balance)), 0);
    assert.strictEqual(spent, 100);
});

test('concurrent multi-opens never take a case past its limit', async () => {
    const sequelize = await setup({ players: 3, openLimit: 5 });

    const results = await openAtOnce([1, 2, 3].map((userId) => ({ userId, count: 2 })));

    const won = results.filter((r) => r.code === 200 && r.payload.data);
    assert.strictEqual(won.length, 2, JSON.stringify(results.map((r) => [r.code, r.payload.message])));
    results.filter((r) => !(r.code === 200 && r.payload.data)).forEach(assertRefusedForLimit);

    assert.deepStrictEqual(await caseRow(sequelize), { openedCount: 4, published: 1 });
    assert.strictEqual(await countRows(sequelize, 'case_opens'), 4);
});

test('one player sending parallel opens cannot overshoot the limit either', async () => {
    const sequelize = await setup({
        players: 1, openLimit: 1000, openedCount: 900, balance: 100000,
    });

    const results = await openAtOnce(Array.from({ length: 3 }, () => ({ userId: 1, count: 100 })));

    const won = results.filter((r) => r.code === 200 && r.payload.data);
    assert.strictEqual(won.length, 1, JSON.stringify(results.map((r) => [r.code, r.payload.message])));
    results.filter((r) => !(r.code === 200 && r.payload.data)).forEach(assertRefusedForLimit);

    assert.deepStrictEqual(await caseRow(sequelize), { openedCount: 1000, published: 0 });
    const [[user]] = await sequelize.query('SELECT balance FROM users WHERE id = 1');
    assert.strictEqual(Number(user.balance), 90000);
});
