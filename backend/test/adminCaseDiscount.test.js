const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const update = async (id, body) => {
    const CasesController = require('../src/controllers/admin/cases');
    const req = { params: { id }, body, user: { profile: { user_id: 1 } } };
    for (const validator of CasesController.validate('update')) {
        await validator.run(req);
    }
    return new Promise((resolve) => {
        const res = {
            statusCode: null,
            status(c) { this.statusCode = c; return this; },
            json(payload) { resolve({ code: this.statusCode, payload }); },
        };
        CasesController.update(req, res);
    });
};

const seed = async (price, discount) => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES "
        + "('t1', 'T', ?, ?, 1, 1, 0, 'weapon', -1)",
        { replacements: [price, discount] },
    );
    return sequelize;
};

const stored = async (sequelize) => {
    const [[row]] = await sequelize.query("SELECT price, discount FROM cases WHERE id = 't1'");
    return { price: Number(row.price), discount: row.discount === null ? null : Number(row.discount) };
};

const journalSize = async (sequelize) => {
    const [[row]] = await sequelize.query('SELECT COUNT(*) AS n FROM admin_actions');
    return Number(row.n);
};

test('a sale price at or above the case price is refused', async () => {
    const sequelize = await seed(5000, 0);
    const MESSAGE = require('../src/constant/responseMessages');

    for (const discount of [5000, 6000]) {
        const result = await update('t1', { case_discount: discount });
        assert.strictEqual(result.code, 422, `discount ${discount}: ${JSON.stringify(result.payload)}`);
        assert.strictEqual(result.payload.message, MESSAGE.ADMIN.DISCOUNT_INVALID);
    }

    assert.deepStrictEqual(await stored(sequelize), { price: 5000, discount: 0 });
    assert.strictEqual(await journalSize(sequelize), 0);
});

test('a sale price is judged against the price sent in the same request', async () => {
    const sequelize = await seed(5000, 0);

    const refused = await update('t1', { case_price: 100, case_discount: 150 });
    assert.strictEqual(refused.code, 422);

    const accepted = await update('t1', { case_price: 8000, case_discount: 6000 });
    assert.strictEqual(accepted.code, 200, JSON.stringify(accepted.payload));
    assert.deepStrictEqual(await stored(sequelize), { price: 8000, discount: 6000 });
});

test('lowering the price below the stored sale price is refused', async () => {
    const sequelize = await seed(5000, 150);

    const refused = await update('t1', { case_price: 100 });
    assert.strictEqual(refused.code, 422);
    assert.deepStrictEqual(await stored(sequelize), { price: 5000, discount: 150 });
});

test('a sale price below the case price is stored', async () => {
    const sequelize = await seed(5000, 0);

    const result = await update('t1', { case_discount: 4000 });
    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.deepStrictEqual(await stored(sequelize), { price: 5000, discount: 4000 });
    assert.strictEqual(await journalSize(sequelize), 1);
});

test('a zero sale price clears the discount', async () => {
    const sequelize = await seed(5000, 4000);

    const zero = await update('t1', { case_discount: 0 });
    assert.strictEqual(zero.code, 200, JSON.stringify(zero.payload));
    assert.deepStrictEqual(await stored(sequelize), { price: 5000, discount: 0 });
});

test('an emptied sale price clears the discount instead of failing validation', async () => {
    const sequelize = await seed(5000, 4000);

    const result = await update('t1', { case_discount: null });
    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.deepStrictEqual(await stored(sequelize), { price: 5000, discount: 0 });
});

test('edits that leave price and sale price alone are not blocked by an old sale price', async () => {
    const sequelize = await seed(100, 150);

    const result = await update('t1', { case_title: 'Renamed' });
    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    const [[row]] = await sequelize.query("SELECT title FROM cases WHERE id = 't1'");
    assert.strictEqual(row.title, 'Renamed');
});

test('an empty price is still refused', async () => {
    const sequelize = await seed(5000, 0);

    const result = await update('t1', { case_price: null });
    assert.strictEqual(result.code, 422);
    assert.deepStrictEqual(await stored(sequelize), { price: 5000, discount: 0 });
});
