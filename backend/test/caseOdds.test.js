const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

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

test('a case comes with the chance of every item it holds, as the draw works them out', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES ('dust2', 'Dust 2', 360, 0, 1, 1, 0, 'weapon', -1)",
    );
    const allCases = require('../src/constant/cases/_all');
    const { itemOdds } = require('../src/modules/provablyFair');
    const CaseController = require('../src/controllers/case');

    const answer = await respond(CaseController.getCaseById, { params: { id: 'dust2' } });

    assert.strictEqual(answer.code, 200);
    assert.deepStrictEqual(answer.payload.odds, itemOdds(allCases.dust2));
    assert.deepStrictEqual(
        Object.keys(answer.payload.odds).sort(),
        [...new Set(allCases.dust2.ITEMS.map((item) => String(item.id)))].sort(),
    );
});

test('a case that has no definition in code comes without odds', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES ('nocode', 'No code', 100, 0, 1, 1, 0, 'weapon', -1)",
    );
    const CaseController = require('../src/controllers/case');

    const answer = await respond(CaseController.getCaseById, { params: { id: 'nocode' } });

    assert.strictEqual(answer.code, 200);
    assert.strictEqual(answer.payload.data.case_id, 'nocode');
    assert.strictEqual(answer.payload.odds, undefined);
});
