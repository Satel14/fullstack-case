const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const express = require('express');
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

const untouched = {
    log: console.log,
    error: console.error,
    getStorageById: StorageService.getStorageById,
};

const storageAnswers = [[StorageService, 'getStorageById', async (userId, status) => [{ storage_status: status }]]];

const listStorage = async (body) => respond(
    StorageController.getProfileStorage,
    await checkedBy(StorageController.validate('getProfileStorage'), { body, user: player }),
);

test('the item list is asked for by one of the four statuses and nothing else reaches the query', async () => {
    const crafted = [
        { status: { a: 'x'.repeat(1000) } },
        { status: ['inventory', { a: 1 }] },
        { status: 'stolen' },
        { status: 42 },
    ];

    const { result: answers, logged } = await quietly(storageAnswers, () => Promise.all(crafted.map(listStorage)));

    assert.deepStrictEqual(
        answers.map(({ code, payload }) => [code, payload.message]),
        crafted.map(() => [422, MESSAGE.VALIDATOR.ERROR]),
    );
    assert.deepStrictEqual(logged, []);
});

test('the item list still answers each status the inventory page asks for, and nothing for no status', async () => {
    const statuses = ['inventory', 'received', 'waitingtrade', 'money'];

    const { result: answers } = await quietly(storageAnswers, () => Promise.all([
        ...statuses.map((status) => listStorage({ status, limit: 50, offset: 0 })),
        listStorage({}),
    ]));

    assert.deepStrictEqual(
        answers.map(({ code, payload }) => [code, payload.data]),
        [...statuses.map((status) => [200, [{ storage_status: status }]]), [200, []]],
    );
});

const CaseController = require('../src/controllers/case');
const allCases = require('../src/constant/cases/_all');

const openCase = async (body) => respond(
    CaseController.openCaseById,
    await checkedBy(CaseController.validate('openCaseById'), { body, user: player }),
);

test('a case open names its case by a case id and its count by a plain number, or is refused before either is logged', async () => {
    const crafted = [
        { id: 'dust2\n[auth] administrator signed in', count: 1 },
        { id: ['dust2'], count: 1 },
        { id: 'DUST2 ', count: 1 },
        { id: 'x'.repeat(65), count: 1 },
        { id: 'dust2', count: ['1', '2'] },
        { id: 'dust2', count: '1e2' },
    ];

    const { result: answers, logged } = await quietly([], () => Promise.all(crafted.map(openCase)));

    assert.deepStrictEqual(
        answers.map(({ code, payload }) => [code, payload.message]),
        crafted.map(() => [422, MESSAGE.VALIDATOR.ERROR]),
    );
    assert.deepStrictEqual([...new Set(logged)], ['[DEBUG] openCaseById called']);
});

test('the case open rules pass every case there is, one at a time or a hundred', async () => {
    const bodies = Object.keys(allCases).flatMap((id) => [{ id, count: 1 }, { id, count: '100' }]);

    const verdicts = await Promise.all(bodies.map(async (body) => (
        validationResult(await checkedBy(CaseController.validate('openCaseById'), { body })).isEmpty()
    )));

    assert.strictEqual(bodies.length, 76);
    assert.deepStrictEqual(verdicts, bodies.map(() => true));
});

const AdminCasesController = require('../src/controllers/admin/cases');

const passesAdminCaseRules = async (req) => validationResult(
    await checkedBy(AdminCasesController.validate('update'), req),
).isEmpty();

test('the admin case update refuses lists for its numbers and an id that is no case id', async () => {
    const crafted = [
        { params: { id: 'dust2' }, body: { case_price: [100, 'x'] } },
        { params: { id: 'dust2' }, body: { case_discount: ['50', '60'] } },
        { params: { id: 'dust2' }, body: { case_published: [1, 0] } },
        { params: { id: 'dust2' }, body: { case_openLimit: ['-1', '5'] } },
        { params: { id: 'dust2\n[admin] forged' }, body: { case_price: 100 } },
    ];

    assert.deepStrictEqual(await Promise.all(crafted.map(passesAdminCaseRules)), crafted.map(() => false));
});

test('the admin case update rules still pass what the admin panel sends', async () => {
    const sent = [
        { params: { id: 'dust2' }, body: { case_price: 120 } },
        { params: { id: 'st-marc' }, body: { case_discount: 0 } },
        { params: { id: 'rising-sun' }, body: { case_discount: 99, case_published: 0, case_openLimit: -1 } },
        { params: { id: 'havoc' }, body: { case_title: 'Havoc', case_published: 1, case_openLimit: 500 } },
    ];

    assert.deepStrictEqual(await Promise.all(sent.map(passesAdminCaseRules)), sent.map(() => true));
});

const BACKEND = path.join(__dirname, '..');

const jsFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
        return jsFiles(full);
    }
    return entry.name.endsWith('.js') ? [full] : [];
});

const definedRuleSets = () => jsFiles(path.join(BACKEND, 'src', 'controllers')).flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');
    const start = source.indexOf('module.exports.validate');
    if (start === -1) {
        return [];
    }
    return [...source.slice(start).matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)]
        .map(([, key]) => `${path.relative(BACKEND, file)}#${key}`);
});

const mountedRuleSets = () => [...jsFiles(path.join(BACKEND, 'src', 'routes')), path.join(BACKEND, 'routes.js')].flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');
    const controllers = new Map([...source.matchAll(/const\s+(\w+)\s*=\s*require\(['"]([^'"]*controllers[^'"]*)['"]\)/g)]
        .map(([, name, request]) => [name, path.relative(BACKEND, require.resolve(path.resolve(path.dirname(file), request)))]));
    return [...source.matchAll(/(\w+)\.validate\(['"]([^'"]+)['"]\)/g)]
        .filter(([, name]) => controllers.has(name))
        .map(([, name, key]) => `${controllers.get(name)}#${key}`);
});

test('every rule set a controller defines is mounted on a route', () => {
    const mounted = new Set(mountedRuleSets());
    const defined = definedRuleSets();

    assert.ok(defined.length >= 25, `only ${defined.length} rule sets found`);
    assert.deepStrictEqual(defined.filter((ruleSet) => !mounted.has(ruleSet)), []);
});

const routesOf = (stack) => stack.flatMap((layer) => {
    if (layer.route) {
        return [layer.route];
    }
    if (layer.handle && layer.handle.stack) {
        return routesOf(layer.handle.stack);
    }
    return [];
});

test('every route that checks its input with rules reads their verdict in its handler', () => {
    const app = express();
    require('../routes')(app);
    const ruled = routesOf(app._router.stack)
        .filter((route) => route.stack.some(({ handle }) => typeof handle.run === 'function' && handle.builder));

    const unread = ruled
        .filter((route) => !String(route.stack[route.stack.length - 1].handle).includes('validationResult(req)'))
        .map((route) => `${Object.keys(route.methods).join(',').toUpperCase()} ${route.path}`);

    assert.ok(ruled.length >= 20, `only ${ruled.length} routes with rules found`);
    assert.deepStrictEqual(unread, []);
});

test('the rule tests leave the console and the stubbed service as they found them', () => {
    assert.strictEqual(console.log, untouched.log);
    assert.strictEqual(console.error, untouched.error);
    assert.strictEqual(StorageService.getStorageById, untouched.getStorageById);
});
