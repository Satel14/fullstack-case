const test = require('node:test');
const assert = require('node:assert');
const { validationResult } = require('express-validator');
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

const SECRET = 'https://steamcommunity.com/tradeoffer/new/?partner=123&token=SECRET-TOKEN';

const PUBLIC_HISTORY_FIELDS = [
    'created_at', 'storage_caseId', 'storage_color', 'storage_id', 'storage_itemId', 'storage_status',
];

const call = async (handlerName, params, validatorName = handlerName) => {
    const StorageController = require('../src/controllers/storage');
    const req = { params, body: {} };
    for (const validator of StorageController.validate(validatorName) || []) {
        await validator.run(req);
    }
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(payload) { resolve({ code: this.statusCode, payload, valid: validationResult(req).isEmpty() }); },
        };
        StorageController[handlerName](req, res);
    });
};

const seed = async (sequelize) => {
    await sequelize.query(
        'INSERT INTO users (login, password, email, balance, `rank`, role, receiveInfo) VALUES '
        + "('owner', 'x', 'owner@e.ua', 0, 0, 1, ?)",
        { replacements: [SECRET] },
    );
    await sequelize.query(
        'INSERT INTO storage (userId, itemId, color, caseId, status, extraData) VALUES '
        + "(1, 707, 'default', 'dust2', 'waitingtrade', ?), (1, 708, 'painted', 'mirage', 'inventory', NULL)",
        { replacements: [SECRET] },
    );
    await sequelize.query(
        'INSERT INTO cases (id, title, price, discount, categoryId, published, img, openedCount, type, openLimit) VALUES '
        + "('dust2', 'Dust 2', 100, 100, 1, 1, '', 0, 'default', 1000), "
        + "('mirage', 'Mirage', 100, 100, 1, 1, '', 0, 'default', 1000)",
    );
};

test('the public per-user history returns only the fields the site reads, never the withdrawal contact', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize);

    const result = await call('getStorageLastItemsByUserId', { id: '1', limit: '10', offset: '0' });

    assert.strictEqual(result.code, 200);
    assert.strictEqual(result.payload.data.length, 2);
    result.payload.data.forEach((row) => assert.deepStrictEqual(Object.keys(row).sort(), PUBLIC_HISTORY_FIELDS));
    assert.ok(!JSON.stringify(result.payload).includes('SECRET-TOKEN'));
});

test('the other public storage lists never carry the withdrawal contact', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize);

    const responses = [
        await call('getStorageLastItems', { limit: '40' }),
        await call('getStorageLastItemsWithUserInfo', { limit: '40' }),
        await call('getStorageItemsCountByUserId', { id: '1' }),
        await call('getFavoriteCaseByUserId', { id: '1' }),
        await call('getStorageTop', { limit: '10', offset: '0' }),
    ];

    responses.forEach((result) => {
        assert.notStrictEqual(result.code, 500, JSON.stringify(result.payload));
        assert.ok(!JSON.stringify(result.payload).includes('SECRET-TOKEN'), JSON.stringify(result.payload));
        assert.ok(!JSON.stringify(result.payload).includes('extraData'), JSON.stringify(result.payload));
    });
});
