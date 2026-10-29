const test = require('node:test');
const assert = require('node:assert');
const { validationResult } = require('express-validator');
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
const Item = require('../src/models/item');
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
        name: 'the recipient lookup of a transfer',
        stubs: [[User, 'findByPk', outage]],
        call: () => respond(
            require('../src/controllers/user').sendMoneyForUserByUserId,
            { body: { userIdTo: 2, money_count: 10 }, user: player },
        ),
    },
    {
        name: 'the item lookup of a sale',
        stubs: [
            [Storage, 'findOne', async () => ({ dataValues: { storage_itemId: 707, storage_color: 'default' } })],
            [Item, 'findByPk', outage],
        ],
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

const loggedLines = (logged) => logged.map((args) => args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));

const ADMIN_LOOKUPS = [
    ['a role change', 'setRole', { params: { id: '2' }, body: { role: 1 } }],
    ['a balance correction', 'adjustBalance', { params: { id: '2' }, body: { delta: 10, reason: 'gift' } }],
];

ADMIN_LOOKUPS.forEach(([name, handler, req]) => {
    test(`a database outage while ${name} looks the player up is logged, not answered as a missing player`, async () => {
        const { result, logged } = await withStubs([[User, 'findByPk', outage]], () => respond(
            require('../src/controllers/admin/users')[handler],
            { ...req, user: player },
        ));

        assert.deepStrictEqual([result.code, result.payload.message], [400, MESSAGE.ADMIN.ERROR]);
        assert.ok(loggedLines(logged).some((line) => line.includes(OUTAGE)), JSON.stringify(loggedLines(logged)));
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
        name: 'opening a case that is in the database but not in the code',
        stubs: [[Case, 'findOne', async () => ({
            case_id: 'ghost-case', case_published: 1, case_openLimit: -1, case_openedCount: 0, case_price: 10, case_discount: 0,
        })]],
        call: () => respond(require('../src/controllers/case').openCaseById, { body: { id: 'ghost-case', count: 1 }, user: player }),
        code: 422,
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

const checkedByTheRules = async (fields) => {
    const req = drawCheck(fields);
    await Promise.all(require('../src/controllers/provablyFair').validate('verify').map((rule) => rule.run(req)));
    return req;
};

const CRAFTED_DRAW_CHECKS = [
    ['an empty stored-open id and a case id that is not text', { openId: null, caseId: { toString: 1 } }],
    ['a stored-open id given as a list', { openId: ['5', '\n[auth] administrator signed in\n'] }],
    ['a nonce given as a list', { nonce: ['1', { toString: 1 }], caseId: 'dust2' }],
];

CRAFTED_DRAW_CHECKS.forEach(([name, fields]) => {
    test(`a draw check with ${name} is refused as bad input and logs nothing`, async () => {
        const { result, logged } = await withStubs([], async () => respond(
            require('../src/controllers/provablyFair').verify,
            await checkedByTheRules(fields),
        ));

        assert.strictEqual(result.code, 422, JSON.stringify(result.payload));
        assert.strictEqual(result.payload.message, MESSAGE.VALIDATOR.ERROR);
        assert.deepStrictEqual(logged, []);
    });
});

test('the draw check rules still pass a current-case check, a stored-open check and an empty stored-open id beside a case', async () => {
    const passing = [{ caseId: 'dust2' }, { openId: 5 }, { openId: '5' }, { openId: null, caseId: 'dust2' }, { nonce: 3, caseId: 'dust2' }];

    const verdicts = await Promise.all(passing.map(async (fields) => validationResult(await checkedByTheRules(fields)).isEmpty()));

    assert.deepStrictEqual(verdicts, passing.map(() => true));
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
    const files = [...sourceFiles(SOURCE_ROOT), path.join(__dirname, '..', 'routes.js'), path.join(__dirname, '..', 'server.js'), path.join(__dirname, '..', 'app.js')];
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

const leakyDatabaseError = () => {
    const error = new Error('Lock wait timeout exceeded; try restarting transaction');
    error.name = 'SequelizeDatabaseError';
    error.sql = "UPDATE `users` SET `password`='$2b$10$SECRETHASH' WHERE `email` = 'player@e.ua'";
    error.parameters = ['$2b$10$SECRETHASH', 'player@e.ua'];
    error.original = { code: 'ER_LOCK_WAIT_TIMEOUT', sql: error.sql, parameters: error.parameters };
    error.parent = error.original;
    return error;
};

const printedBy = async (fn) => {
    const printed = [];
    const originalError = console.error;
    console.error = (...args) => { printed.push(require('util').format(...args)); };
    try {
        await fn();
        return printed;
    } finally {
        console.error = originalError;
    }
};

test('an unexpected database error is logged with its message but without the values the query carried', async () => {
    const { answerFailure } = require('../src/helpers/failure');
    const res = { status() { return this; }, json() { return this; } };

    const printed = await printedBy(() => answerFailure(res, leakyDatabaseError(), { status: 400, where: 'probe' }));

    assert.strictEqual(printed.length, 1);
    assert.match(printed[0], /^\[probe\] unexpected error: SequelizeDatabaseError: Lock wait timeout exceeded/);
    assert.doesNotMatch(printed[0], /SECRETHASH|player@e\.ua/);
});

test('a confirmation that fails on the database logs its message but not the hash or the address it was storing', async () => {
    const EmailVerificationService = require('../src/services/emailVerification');
    const handlers = {};
    require('../src/auth/confirmEmail')({ post: (route, ...chain) => { handlers[route] = chain[chain.length - 1]; } });
    const original = EmailVerificationService.confirm;
    EmailVerificationService.confirm = async () => { throw leakyDatabaseError(); };
    let result;
    let printed;
    try {
        printed = await printedBy(async () => {
            result = await respond(handlers['/api/profile/confirm-email'], { body: { token: 'a'.repeat(64) } });
        });
    } finally {
        EmailVerificationService.confirm = original;
    }

    assert.strictEqual(result.code, 500);
    assert.strictEqual(printed.length, 1);
    assert.match(printed[0], /Lock wait timeout exceeded/);
    assert.doesNotMatch(printed[0], /SECRETHASH|player@e\.ua/);
});
