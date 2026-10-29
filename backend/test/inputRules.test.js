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
const UserService = require('../src/services/user');
const UserController = require('../src/controllers/user');

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
    editUser: UserService.editUser,
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

test('the admin case update refuses lists, numbers past what the columns hold, and an id that is no case id', async () => {
    const crafted = [
        { params: { id: 'dust2' }, body: { case_price: [100, 'x'] } },
        { params: { id: 'dust2' }, body: { case_discount: ['50', '60'] } },
        { params: { id: 'dust2' }, body: { case_published: [1, 0] } },
        { params: { id: 'dust2' }, body: { case_openLimit: ['-1', '5'] } },
        { params: { id: 'dust2\n[admin] forged' }, body: { case_price: 100 } },
        { params: { id: 'dust2' }, body: { case_price: 2147483648 } },
        { params: { id: 'dust2' }, body: { case_discount: 2147483648 } },
        { params: { id: 'dust2' }, body: { case_openLimit: 3000000000 } },
    ];

    assert.deepStrictEqual(await Promise.all(crafted.map(passesAdminCaseRules)), crafted.map(() => false));
});

test('the admin case update rules still pass what the admin panel sends', async () => {
    const sent = [
        { params: { id: 'dust2' }, body: { case_price: 120 } },
        { params: { id: 'st-marc' }, body: { case_discount: 0 } },
        { params: { id: 'rising-sun' }, body: { case_discount: 99, case_published: 0, case_openLimit: -1 } },
        { params: { id: 'havoc' }, body: { case_title: 'Havoc', case_published: 1, case_openLimit: 500 } },
        { params: { id: 'dust2' }, body: { case_price: 2147483647, case_openLimit: 2147483647 } },
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

const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const routeFiles = () => [...jsFiles(path.join(BACKEND, 'src', 'routes')), path.join(BACKEND, 'routes.js')];

const ruleSetMounts = () => routeFiles().map((file) => {
    const source = withoutComments(fs.readFileSync(file, 'utf8'));
    const controllers = new Map([...source.matchAll(/const\s+(\w+)\s*=\s*require\(['"]([^'"]*controllers[^'"]*)['"]\)/g)]
        .map(([, name, request]) => [name, path.relative(BACKEND, require.resolve(path.resolve(path.dirname(file), request)))]));
    const mounts = [...source.matchAll(/(\w+)\.validate\(['"]([^'"]+)['"]\)\s*,\s*(\w+)\.(\w+)\s*\)/g)]
        .map(([, owner, key, handlerOwner, handler]) => ({
            ruleSet: `${controllers.get(owner)}#${key}`,
            handler: `${controllers.get(handlerOwner)}#${handler}`,
        }));
    return { file: path.relative(BACKEND, file), calls: (source.match(/\.validate\(/g) || []).length, mounts };
});

test('every rule set a controller defines is mounted on a route', () => {
    const mounted = new Set(ruleSetMounts().flatMap(({ mounts }) => mounts.map(({ ruleSet }) => ruleSet)));
    const defined = definedRuleSets();

    assert.ok(defined.length >= 25, `only ${defined.length} rule sets found`);
    assert.deepStrictEqual(defined.filter((ruleSet) => !mounted.has(ruleSet)), []);
});

test('every rule set sits right before the handler it is named after, and every one a route mounts exists', () => {
    const files = ruleSetMounts();
    const defined = new Set(definedRuleSets());

    assert.deepStrictEqual(files.flatMap(({ mounts }) => mounts).filter(({ ruleSet }) => !defined.has(ruleSet)), []);
    assert.deepStrictEqual(files.filter(({ calls, mounts }) => calls !== mounts.length).map(({ file }) => file), []);
    assert.deepStrictEqual(
        files.flatMap(({ mounts }) => mounts).filter(({ ruleSet, handler }) => ruleSet !== handler),
        [],
    );
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

const LIST_HEADS = ['1', '100', '0', '-1', 'abc', '2147483647'];

test('no rule set lets a list through for a body field it checks, whatever the list starts with', async () => {
    const leaks = [];
    await Promise.all(definedRuleSets().map(async (ruleSet) => {
        const [file, key] = ruleSet.split('#');
        const rules = require(path.join(BACKEND, file)).validate(key);
        const bodyFields = rules
            .map((rule) => rule.builder.build())
            .filter(({ locations }) => locations.length === 1 && locations[0] === 'body')
            .flatMap(({ fields }) => fields);
        await Promise.all(bodyFields.flatMap((field) => LIST_HEADS.map(async (head) => {
            const req = await checkedBy(rules, { body: { [field]: [head, 'x'] }, params: {}, query: {} });
            const refused = validationResult(req).array()
                .some((error) => error.param === field && error.location === 'body');
            if (!refused) {
                leaks.push(`${ruleSet} ${field} [${head}, …]`);
            }
        })));
    }));

    assert.deepStrictEqual(leaks.sort(), []);
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


const editProfile = async (body) => respond(
    UserController.editUser,
    await checkedBy(UserController.validate('editUser'), { body, user: player }),
);

test('a profile edit takes the receive info only as text of at most 1000 characters', async () => {
    const crafted = [{ user_receiveInfo: [] }, { user_receiveInfo: {} }, { user_receiveInfo: 42 }, { user_receiveInfo: 'x'.repeat(1001) }];
    const saved = [];

    const { result: answers, logged } = await quietly(
        [[UserService, 'editUser', async (fields) => { saved.push(fields); }]],
        () => Promise.all(crafted.map(editProfile)),
    );

    assert.deepStrictEqual(
        answers.map(({ code, payload }) => [code, payload.message]),
        crafted.map(() => [422, MESSAGE.VALIDATOR.ERROR]),
    );
    assert.deepStrictEqual(saved, []);
    assert.deepStrictEqual(logged, []);
});

test('a profile edit still saves a trade link, a long note up to the limit and an avatar', async () => {
    const sent = [
        { user_receiveInfo: 'https://steamcommunity.com/tradeoffer/new/?partner=1&token=abcd' },
        { user_receiveInfo: 'y'.repeat(1000) },
        { user_avatar: 3 },
    ];
    const saved = [];

    const { result: answers } = await quietly(
        [[UserService, 'editUser', async (fields) => { saved.push(fields); }]],
        () => Promise.all(sent.map(editProfile)),
    );

    assert.deepStrictEqual(answers.map(({ code }) => code), [200, 200, 200]);
    const inOrder = (list) => list.map((fields) => JSON.stringify(fields)).sort();
    assert.deepStrictEqual(inOrder(saved), inOrder(sent));
});

test('the rule tests leave the console and the stubbed services as they found them', () => {
    assert.strictEqual(console.log, untouched.log);
    assert.strictEqual(console.error, untouched.error);
    assert.strictEqual(StorageService.getStorageById, untouched.getStorageById);
    assert.strictEqual(UserService.editUser, untouched.editUser);
});

const PFService = require('../src/services/provablyFair');
const PFController = require('../src/controllers/provablyFair');

const VS16 = '\uFE0F';

const setClientSeed = async (clientSeed) => respond(
    PFController.setClientSeed,
    await checkedBy(PFController.validate('setClientSeed'), { body: { clientSeed }, user: player }),
);

test('a client seed is measured in characters the way MySQL counts them, so padding cannot slip past its limit', async () => {
    const stored = [];
    const crafted = [`a${VS16.repeat(300)}`, `c${VS16.repeat(64)}`, `x\n[auth] administrator signed in${VS16.repeat(300)}`];
    const fitting = [`b${VS16.repeat(63)}`, '😀'.repeat(64), 'lucky'];

    const { result: answers, logged } = await quietly(
        [[PFService, 'setClientSeed', async (userId, seed) => { stored.push(seed); return { clientSeed: seed }; }]],
        () => Promise.all([...crafted, ...fitting].map(setClientSeed)),
    );

    assert.deepStrictEqual(answers.map(({ code }) => code), [422, 422, 422, 200, 200, 200]);
    assert.deepStrictEqual(stored.sort(), [...fitting].sort());
    assert.deepStrictEqual(logged, []);
});

test('admin reasons and case titles are measured in characters the way MySQL counts them', async () => {
    const AdminUsersController = require('../src/controllers/admin/users');
    const padded = `r${VS16.repeat(300)}`;
    const passes = async (rules, req) => validationResult(await checkedBy(rules, req)).isEmpty();

    assert.deepStrictEqual(await Promise.all([
        passes(AdminUsersController.validate('setRole'), { params: { id: '2' }, body: { role: 1, reason: padded } }),
        passes(AdminUsersController.validate('adjustBalance'), { params: { id: '2' }, body: { delta: 5, reason: padded } }),
        passes(AdminCasesController.validate('update'), { params: { id: 'dust2' }, body: { case_title: padded } }),
        passes(AdminCasesController.validate('update'), { params: { id: 'dust2' }, body: { case_price: 1, reason: padded } }),
    ]), [false, false, false, false]);
    assert.deepStrictEqual(await Promise.all([
        passes(AdminUsersController.validate('adjustBalance'), { params: { id: '2' }, body: { delta: 5, reason: `r${VS16.repeat(254)}` } }),
        passes(AdminCasesController.validate('update'), { params: { id: 'dust2' }, body: { case_title: 'Dust 2' } }),
    ]), [true, true]);
});
