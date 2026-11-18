const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');
const { validationResult } = require('express-validator');
const MESSAGE = require('../src/constant/responseMessages');
const sequelize = require('../src/config/db');
const SaleRateController = require('../src/controllers/admin/saleRate');
const AdminActionService = require('../src/services/adminAction');
const ModuleService = require('../src/services/module');

const ADMIN_ID = 7;

test.after(async () => {
    await sequelize.close();
});

const respond = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler(req, res);
});

const checkedBy = async (rules, req) => {
    await Promise.all(rules.map((rule) => rule.run(req)));
    return req;
};

const setRate = async (body) => respond(
    SaleRateController.update,
    await checkedBy(SaleRateController.validate('update'), { body, user: { profile: { user_id: ADMIN_ID } } }),
);

const readRate = () => respond(SaleRateController.get, {});

const storedRate = async () => {
    const [rows] = await sequelize.query("SELECT CAST(extraData AS CHAR) AS rate FROM modules WHERE param = 'uah-credit-rate'");
    return rows.length ? rows[0].rate : null;
};

const journal = async () => {
    const [rows] = await sequelize.query('SELECT adminId, action, targetType, targetId, payload, reason FROM admin_actions ORDER BY id');
    return rows.map((row) => ({ ...row, payload: JSON.parse(row.payload) }));
};

test('the sale rate is read from its module, and is 1 when the row is missing', async () => {
    await resetTestDatabase();

    assert.deepStrictEqual((await readRate()).payload, { status: 200, data: { rate: 1 } });

    await sequelize.query("UPDATE modules SET extraData = '0.85' WHERE param = 'uah-credit-rate'");
    assert.deepStrictEqual((await readRate()).payload, { status: 200, data: { rate: 0.85 } });

    await sequelize.query("DELETE FROM modules WHERE param = 'uah-credit-rate'");
    assert.deepStrictEqual((await readRate()).payload, { status: 200, data: { rate: 1 } });
});

test('a new sale rate is stored where the sale reads it and journalled with the old one', async () => {
    await resetTestDatabase();

    const { code, payload } = await setRate({ rate: 0.9, reason: 'selling fee' });

    assert.deepStrictEqual([code, payload.data], [200, { rate: 0.9 }]);
    assert.strictEqual(await storedRate(), '0.9');
    assert.strictEqual(Number((await ModuleService.findModuleById('uah-credit-rate')).extraData), 0.9);
    assert.deepStrictEqual(await journal(), [{
        adminId: ADMIN_ID,
        action: 'module.update',
        targetType: 'module',
        targetId: 'uah-credit-rate',
        payload: { before: { rate: 1 }, after: { rate: 0.9 } },
        reason: 'selling fee',
    }]);
});

test('a sale rate is set even when its module row has gone missing', async () => {
    await resetTestDatabase();
    await sequelize.query("DELETE FROM modules WHERE param = 'uah-credit-rate'");

    const { code } = await setRate({ rate: '0.5' });

    assert.strictEqual(code, 200);
    assert.strictEqual(await storedRate(), '0.5');
    assert.deepStrictEqual((await journal()).map((entry) => entry.payload), [{ before: { rate: null }, after: { rate: 0.5 } }]);
});

test('a journal that cannot be written leaves the rate as it was', async () => {
    await resetTestDatabase();
    const record = AdminActionService.record;
    AdminActionService.record = async () => { throw new Error('journal is down'); };
    const originalError = console.error;
    const logged = [];
    console.error = (...args) => { logged.push(args.map(String).join(' ')); };

    try {
        const { code, payload } = await setRate({ rate: 0.5 });
        assert.deepStrictEqual([code, payload.message], [500, MESSAGE.SERVER.ERROR]);
    } finally {
        AdminActionService.record = record;
        console.error = originalError;
    }

    assert.strictEqual(logged.length, 1);
    assert.strictEqual(await storedRate(), '1');
});

test('the rate must pay out more than nothing and never more than the item is worth', async () => {
    const passes = async (body) => validationResult(
        await checkedBy(SaleRateController.validate('update'), { body }),
    ).isEmpty();

    const good = [{ rate: 1 }, { rate: 0.85 }, { rate: '0.5' }, { rate: 0.0001 }, { rate: 0.9, reason: 'fee' }];
    const bad = [
        {},
        { rate: null },
        { rate: 0 },
        { rate: -0.5 },
        { rate: 1.01 },
        { rate: 1.25 },
        { rate: 0.12345 },
        { rate: 'abc' },
        { rate: '' },
        { rate: [0.5] },
        { rate: [0.5, 'x'] },
        { rate: { a: 1 } },
        { rate: 0.5, reason: 'r'.repeat(256) },
        { rate: 0.5, reason: ['why'] },
    ];

    assert.deepStrictEqual(await Promise.all(good.map(passes)), good.map(() => true));
    assert.deepStrictEqual(await Promise.all(bad.map(passes)), bad.map(() => false));
});
