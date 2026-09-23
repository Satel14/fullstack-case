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

test('the public per-user history keeps serving the limits the site sends', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize);

    for (const [limit, offset, rows] of [['5', '0', 2], ['5', '1', 1], ['200', '0', 2], ['1000', '0', 2], ['5', '5', 0]]) {
        const result = await call('getStorageLastItemsByUserId', { id: '1', limit, offset });
        assert.strictEqual(result.code, 200, `limit ${limit} offset ${offset}: ${JSON.stringify(result.payload)}`);
        assert.strictEqual(result.payload.data.length, rows, `limit ${limit} offset ${offset}`);
    }
});

test('the public per-user history answers 422, not 500, to a limit or offset that is not a sane integer', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize);

    const bad = [
        { id: '1', limit: '-1', offset: '0' },
        { id: '1', limit: '.5', offset: '0' },
        { id: '1', limit: '1.5', offset: '0' },
        { id: '1', limit: '0', offset: '0' },
        { id: '1', limit: '1001', offset: '0' },
        { id: '1', limit: '10', offset: '-1' },
        { id: '1', limit: '10', offset: '.5' },
        { id: '1', limit: '10', offset: '99999999999999999999' },
        { id: '1.5', limit: '10', offset: '0' },
        { id: '-1', limit: '10', offset: '0' },
    ];

    for (const params of bad) {
        const result = await call('getStorageLastItemsByUserId', params);
        assert.strictEqual(result.code, 422, `${JSON.stringify(params)}: ${JSON.stringify(result.payload)}`);
    }
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

test('the other public storage endpoints do not answer 500 to odd numbers', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize);

    const cases = [
        ['getStorageLastItems', { limit: '-1' }],
        ['getStorageLastItems', { limit: '.5' }],
        ['getStorageLastItemsWithUserInfo', { limit: '-1' }],
        ['getStorageLastItemsWithUserInfo', { limit: '.5' }],
        ['getStorageItemsCountByUserId', { id: '1.5' }],
        ['getStorageItemsCountByUserId', { id: '-1' }],
        ['getFavoriteCaseByUserId', { id: '1.5' }],
        ['getStorageTop', { limit: '.5', offset: '0' }],
        ['getStorageTop', { limit: '10', offset: '1.5' }],
        ['getStorageTop', { limit: '-1', offset: '0' }],
        ['getStorageTop', { limit: '10', offset: '-1' }],
        ['getStorageTop', { limit: '10', offset: '99999999999999999999' }],
    ];

    for (const [handler, params] of cases) {
        const result = await call(handler, params);
        assert.notStrictEqual(result.code, 500, `${handler} ${JSON.stringify(params)}: ${JSON.stringify(result.payload)}`);
    }
});

test('the Top leaderboard keeps paging the way the site asks for it', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seed(sequelize);

    const first = await call('getStorageTop', { limit: '10', offset: '0' });
    assert.strictEqual(first.code, 200);
    assert.deepStrictEqual(first.payload.data.map((r) => [r.userId, r.count]), [[1, 2]]);

    const next = await call('getStorageTop', { limit: '10', offset: '10' });
    assert.strictEqual(next.code, 200);
    assert.deepStrictEqual(next.payload.data, []);
});
