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

test('each open stores the draw table it was decided by, and verification by openId survives later case changes', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', 'x', 'player@e.ua', 10000, 0, 1)",
    );
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES "
        + "('dust2', 'DUST2', 100, 0, 1, 1, 0, 'weapon', -1)",
    );

    const allCases = require('../src/constant/cases/_all');
    const originalCase = allCases.dust2;
    stubItemCache(originalCase);

    const CaseController = require('../src/controllers/case');
    const PFController = require('../src/controllers/provablyFair');
    const MESSAGE = require('../src/constant/responseMessages');
    const { deriveFromTable } = require('../src/modules/provablyFair');

    const opened = await respond(CaseController.openCaseById, {
        body: { id: 'dust2', count: 3 },
        user: { profile: { user_id: 1 } },
    });
    assert.strictEqual(opened.code, 200, JSON.stringify(opened.payload));

    const [opens] = await sequelize.query('SELECT * FROM case_opens ORDER BY id');
    const [[seed]] = await sequelize.query('SELECT serverSeed, serverSeedHash FROM provably_fair_seeds');
    assert.strictEqual(opens.length, 3);
    for (const open of opens) {
        assert.ok(open.drawTable, `open ${open.id} has no draw table`);
        const w = deriveFromTable(seed.serverSeed, open.clientSeed, open.nonce, JSON.parse(open.drawTable));
        assert.deepStrictEqual([w.itemId, w.color], [open.resultItemId, open.resultColor]);
    }

    try {
        allCases.dust2 = { ...originalCase, ITEMS: [...originalCase.ITEMS].reverse() };

        for (const open of opens) {
            const body = {
                openId: open.id, serverSeed: seed.serverSeed, clientSeed: open.clientSeed, nonce: open.nonce,
            };
            const verified = await respond(PFController.verify, { body });
            assert.strictEqual(verified.code, 200, JSON.stringify(verified.payload));
            assert.strictEqual(verified.payload.data.source, 'snapshot');
            assert.strictEqual(verified.payload.data.seedMatches, true);
            assert.strictEqual(verified.payload.data.matchesRecord, true);
            assert.strictEqual(verified.payload.data.itemId, open.resultItemId);
        }

        const wrongSeed = await respond(PFController.verify, {
            body: { openId: opens[0].id, serverSeed: 'not-the-seed', clientSeed: opens[0].clientSeed, nonce: opens[0].nonce },
        });
        assert.strictEqual(wrongSeed.payload.data.seedMatches, false);
    } finally {
        allCases.dust2 = originalCase;
    }

    await sequelize.query('UPDATE case_opens SET drawTable = NULL WHERE id = ?', { replacements: [opens[0].id] });
    const legacy = await respond(PFController.verify, {
        body: { openId: opens[0].id, serverSeed: seed.serverSeed, clientSeed: opens[0].clientSeed, nonce: opens[0].nonce },
    });
    assert.strictEqual(legacy.code, 422);
    assert.strictEqual(legacy.payload.message, MESSAGE.PROVABLY_FAIR.NO_SNAPSHOT);

    const missing = await respond(PFController.verify, {
        body: { openId: 999999, serverSeed: seed.serverSeed, clientSeed: 'c', nonce: 0 },
    });
    assert.strictEqual(missing.code, 422);
    assert.strictEqual(missing.payload.message, MESSAGE.PROVABLY_FAIR.OPEN_NOT_FOUND);

    const current = await respond(PFController.verify, {
        body: { caseId: 'dust2', serverSeed: seed.serverSeed, clientSeed: opens[1].clientSeed, nonce: opens[1].nonce },
    });
    assert.strictEqual(current.code, 200);
    assert.strictEqual(current.payload.data.source, 'current');

    const PFService = require('../src/services/provablyFair');
    const history = await PFService.getHistory(1, 10, 0);
    const byId = Object.fromEntries(history.map((h) => [h.id, h.hasSnapshot]));
    assert.strictEqual(byId[opens[0].id], false);
    assert.strictEqual(byId[opens[1].id], true);
    assert.ok(history.every((h) => !('drawTable' in h)), 'history must not ship the draw tables');
});
