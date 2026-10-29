const test = require('node:test');
const assert = require('node:assert');
const { validationResult } = require('express-validator');
const { assertSafeTestDatabase } = require('./helpers/db');

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

const MESSAGE = require('../src/constant/responseMessages');
const sequelize = require('../src/config/db');
const StorageService = require('../src/services/storage');
const StorageController = require('../src/controllers/storage');

test.before(() => {
    assertSafeTestDatabase();
});

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

const quietly = async (stubs, fn) => {
    const logged = [];
    const originals = stubs.map(([object, method]) => [object, method, object[method]]);
    const originalError = console.error;
    const originalLog = console.log;
    stubs.forEach(([object, method, impl]) => { object[method] = impl; });
    console.error = (...args) => { logged.push(args.map(String).join(' ')); };
    console.log = (...args) => { logged.push(args.map(String).join(' ')); };
    try {
        return { result: await fn(), logged };
    } finally {
        console.error = originalError;
        console.log = originalLog;
        originals.forEach(([object, method, original]) => { object[method] = original; });
    }
};

const player = { profile: { user_id: 1 } };

const listStorage = (body) => quietly(
    [[StorageService, 'getStorageById', async (userId, status) => [{ storage_status: status }]]],
    async () => respond(
        StorageController.getProfileStorage,
        await checkedBy(StorageController.validate('getProfileStorage'), { body, user: player }),
    ),
);

test('the item list is asked for by one of the four statuses and nothing else reaches the query', async () => {
    const crafted = [
        { status: { a: 'x'.repeat(1000) } },
        { status: ['inventory', { a: 1 }] },
        { status: 'stolen' },
        { status: 42 },
    ];

    const answers = await Promise.all(crafted.map(listStorage));

    assert.deepStrictEqual(
        answers.map(({ result }) => [result.code, result.payload.message]),
        crafted.map(() => [422, MESSAGE.VALIDATOR.ERROR]),
    );
    assert.deepStrictEqual(answers.flatMap(({ logged }) => logged), []);
});

test('the item list still answers each status the inventory page asks for, and nothing for no status', async () => {
    const statuses = ['inventory', 'received', 'waitingtrade', 'money'];

    const answers = await Promise.all([...statuses.map((status) => listStorage({ status, limit: 50, offset: 0 })), listStorage({})]);

    assert.deepStrictEqual(
        answers.map(({ result }) => [result.code, result.payload.data]),
        [...statuses.map((status) => [200, [{ storage_status: status }]]), [200, []]],
    );
});

const CaseController = require('../src/controllers/case');
const allCases = require('../src/constant/cases/_all');

const openCase = (body) => quietly([], async () => respond(
    CaseController.openCaseById,
    await checkedBy(CaseController.validate('openCaseById'), { body, user: player }),
));

test('a case open names its case by a case id and its count by a plain number, or is refused before either is logged', async () => {
    const crafted = [
        { id: 'dust2\n[auth] administrator signed in', count: 1 },
        { id: ['dust2'], count: 1 },
        { id: 'DUST2 ', count: 1 },
        { id: 'x'.repeat(65), count: 1 },
        { id: 'dust2', count: ['1', '2'] },
        { id: 'dust2', count: '1e2' },
    ];

    const answers = await Promise.all(crafted.map(openCase));

    assert.deepStrictEqual(
        answers.map(({ result }) => [result.code, result.payload.message]),
        crafted.map(() => [422, MESSAGE.VALIDATOR.ERROR]),
    );
    assert.deepStrictEqual([...new Set(answers.flatMap(({ logged }) => logged))], ['[DEBUG] openCaseById called']);
});

test('the case open rules pass every case there is, one at a time or a hundred', async () => {
    const bodies = Object.keys(allCases).flatMap((id) => [{ id, count: 1 }, { id, count: '100' }]);

    const verdicts = await Promise.all(bodies.map(async (body) => (
        validationResult(await checkedBy(CaseController.validate('openCaseById'), { body })).isEmpty()
    )));

    assert.strictEqual(bodies.length, 76);
    assert.deepStrictEqual(verdicts, bodies.map(() => true));
});
