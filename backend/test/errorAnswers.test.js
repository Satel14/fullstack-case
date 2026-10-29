const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
require('./helpers/db');

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

const MESSAGE = require('../src/constant/responseMessages');
const sequelize = require('../src/config/db');
const User = require('../src/models/user');
const Case = require('../src/models/case');
const Article = require('../src/models/article');
const Module = require('../src/models/module');
const Storage = require('../src/models/storage');
const ProvablyFairSeed = require('../src/models/provablyFairSeed');
const CaseOpenRecord = require('../src/models/caseOpenRecord');
const RedisManager = require('../src/redis/manager');

const OUTAGE = 'connect ECONNREFUSED 10.20.30.40:3306';

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

const authHandlers = {};
require('../src/auth/login')({ post: (route, ...chain) => { authHandlers[route] = chain[chain.length - 1]; } });

const withStubs = async (stubs, fn) => {
    const originals = stubs.map(([object, method]) => [object, method, object[method]]);
    const logged = [];
    const originalError = console.error;
    stubs.forEach(([object, method, impl]) => { object[method] = impl; });
    console.error = (...args) => { logged.push(args); };
    try {
        const result = await fn();
        return { result, logged };
    } finally {
        console.error = originalError;
        originals.forEach(([object, method, original]) => { object[method] = original; });
    }
};

const outage = async () => { throw new Error(OUTAGE); };
const nothing = async () => null;
const player = { profile: { user_id: 1 } };
const drawCheck = (fields) => ({ body: { serverSeed: 'server', clientSeed: 'client', nonce: '0', ...fields } });

const OUTAGES = [
    {
        name: 'a public profile',
        stubs: [[User, 'findByPk', outage]],
        call: () => respond(require('../src/controllers/user').getUserById, { params: { id: '5' } }),
    },
    {
        name: 'a login',
        stubs: [[User, 'findOne', outage]],
        call: () => respond(authHandlers['/api/profile/login'], { body: { login: 'player', password: 'secret123' } }),
    },
    {
        name: 'a promocode',
        stubs: [[sequelize, 'transaction', outage]],
        call: () => respond(require('../src/controllers/promocode').usePromocode, { body: { promocode: 'GIFT' }, user: player }),
    },
    {
        name: 'the module list',
        stubs: [[Module, 'findAll', outage]],
        call: () => respond(require('../src/controllers/module').getAllModules, {}),
    },
    {
        name: 'a case open',
        stubs: [[Case, 'findOne', outage]],
        call: () => respond(require('../src/controllers/case').openCaseById, { body: { id: 'dust2', count: 1 }, user: player }),
    },
    {
        name: 'a sale',
        stubs: [[Storage, 'findOne', outage]],
        call: () => respond(require('../src/controllers/storage').sellItemByStorageId, { params: { id: '1' }, user: player }),
    },
    {
        name: 'the provably fair state',
        stubs: [[ProvablyFairSeed, 'findOne', outage]],
        call: () => respond(require('../src/controllers/provablyFair').getState, { user: player }),
    },
    {
        name: 'a draw check of a stored open',
        stubs: [[CaseOpenRecord, 'findByPk', outage]],
        call: () => respond(require('../src/controllers/provablyFair').verify, drawCheck({ openId: 5 })),
    },
    {
        name: 'a draw check against the current case',
        stubs: [[RedisManager, 'getAllDataHashWithKey', outage]],
        call: () => respond(require('../src/controllers/provablyFair').verify, drawCheck({ caseId: 'dust2' })),
    },
    {
        name: 'the site stats',
        stubs: [[Storage, 'count', outage]],
        call: () => respond(require('../src/controllers/stats').getSiteStats, {}),
    },
];

OUTAGES.forEach(({ name, stubs, call }) => {
    test(`a database outage during ${name} answers 500 with a fixed Ukrainian text and logs the real error`, async () => {
        const { result, logged } = await withStubs(stubs, call);

        assert.strictEqual(result.code, 500, JSON.stringify(result.payload));
        assert.strictEqual(result.payload.message, MESSAGE.SERVER.ERROR);
        assert.doesNotMatch(JSON.stringify(result.payload), /ECONNREFUSED|10\.20\.30\.40/);
        const loggedText = logged.map((args) => args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
        assert.ok(loggedText.some((line) => line.includes(OUTAGE)), `the real error was not logged: ${JSON.stringify(loggedText)}`);
    });
});

const REFUSALS = [
    {
        name: 'an unknown player',
        stubs: [[User, 'findByPk', nothing]],
        call: () => respond(require('../src/controllers/user').getUserById, { params: { id: '5' } }),
        code: 400,
        message: MESSAGE.USER.NOT_EXIST,
    },
    {
        name: 'an unknown article',
        stubs: [[Article, 'findByPk', nothing]],
        call: () => respond(require('../src/controllers/article').getArticleById, { params: { id: '5' } }),
        code: 400,
        message: MESSAGE.ARTICLE.NOT_EXIST,
    },
    {
        name: 'opening an unknown case',
        stubs: [[Case, 'findOne', nothing]],
        call: () => respond(require('../src/controllers/case').openCaseById, { body: { id: 'nope', count: 1 }, user: player }),
        code: 400,
        message: MESSAGE.CASE.NOT_EXIST,
    },
    {
        name: 'an unknown case page',
        stubs: [[Case, 'findOne', nothing]],
        call: () => respond(require('../src/controllers/case').getCaseById, { params: { id: 'nope' } }),
        code: 400,
        message: MESSAGE.CASE.NOT_EXIST,
    },
    {
        name: 'a draw check of a name that is no case',
        stubs: [],
        call: () => respond(require('../src/controllers/provablyFair').verify, drawCheck({ caseId: 'constructor' })),
        code: 422,
        message: MESSAGE.CASE.NOT_EXIST,
    },
    {
        name: 'a profile edit of a field players may not change',
        stubs: [],
        call: () => respond(require('../src/controllers/user').editUser, { body: { user_balance: 1000 }, user: player }),
        code: 400,
        message: MESSAGE.USER.CANT_UPDATE_FIELD,
    },
];

REFUSALS.forEach(({
    name, stubs, call, code, message,
}) => {
    test(`a deliberate refusal for ${name} keeps its status and its text`, async () => {
        const { result } = await withStubs(stubs, call);

        assert.strictEqual(result.code, code, JSON.stringify(result.payload));
        assert.strictEqual(result.payload.message, message);
    });
});

const SOURCE_ROOT = path.join(__dirname, '..', 'src');

const sourceFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
        return sourceFiles(full);
    }
    return entry.name.endsWith('.js') ? [full] : [];
});

test('no response is built from the message of a caught error', () => {
    const files = [...sourceFiles(SOURCE_ROOT), path.join(__dirname, '..', 'routes.js'), path.join(__dirname, '..', 'server.js')];
    const offenders = [];

    files.forEach((file) => {
        const source = fs.readFileSync(file, 'utf8');
        const caught = [...source.matchAll(/catch\s*\(\s*\(?\s*(\w+)/g)].map((m) => m[1]);
        if (caught.length === 0) {
            return;
        }
        const usesCaughtMessage = new RegExp(`\\b(${[...new Set(caught)].join('|')})\\.message\\b`);
        source.split('\n').forEach((line, index) => {
            const answers = /\.json\(|\.send\(|\.emit\(|message\s*:/.test(line);
            if (answers && usesCaughtMessage.test(line) && !/console\.\w+\(/.test(line)) {
                offenders.push(`${path.relative(SOURCE_ROOT, file)}:${index + 1}: ${line.trim()}`);
            }
        });
    });

    assert.deepStrictEqual(offenders, []);
});
