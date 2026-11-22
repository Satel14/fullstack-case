const { resetTestDatabase, assertSafeTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const sequelize = require('../src/config/db');
const MESSAGE = require('../src/constant/responseMessages');
const UserService = require('../src/services/user');

let itemHash = {};
const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true,
    exports: { getAllDataHashWithKey: async () => itemHash },
};

const UsersController = require('../src/controllers/admin/users');
const date = new Date('2026-11-17T12:00:00Z');
const newestIds = Array.from({ length: 50 }, (_, index) => 119 - index * 2);

const card = async (id = '1') => {
    const req = { params: { id }, query: {}, body: {}, user: { profile: { user_id: 3 } } };
    await Promise.all(UsersController.validate('getCard').map((rule) => rule.run(req)));
    const res = {
        code: 200,
        status(code) { this.code = code; return this; },
        json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
    };
    await UsersController.getCard(req, res);
    return res;
};

test.before(async () => {
    assertSafeTestDatabase();
    await resetTestDatabase();
    const qi = sequelize.getQueryInterface();
    await qi.bulkInsert('users', [1, 2, 3].map((id) => ({
        id, login: `player${id}`, email: `player${id}@e.ua`, password: 'private-password-hash',
        tokenVersion: 17, role: id === 3 ? 10 : 1, balance: 123.45, rank: 9.5,
        avatar: 4, receiveInfo: `withdrawal-contact-${id}`, created_at: date,
    })));
    await qi.bulkInsert('cases', [{ id: 'dust2', title: 'Dust II', price: 999, published: 1 }]);

    const rows = Array.from({ length: 120 }, (_, index) => ({
        id: index + 1, userId: index % 2 + 1, sequence: Math.floor(index / 2),
    }));
    await qi.bulkInsert('balance_history', rows.map(({ id, userId }) => ({
        id, userId, type: 'admin_adjust', balanceChange: id / 100, extraData: `reason-${userId}-${id}`, created_at: date,
    })));
    await qi.bulkInsert('storage', rows.map(({ id, userId, sequence }) => ({
        id, userId, itemId: id, color: 'painted', caseId: 'dust2',
        status: ['inventory', 'received', 'waitingtrade', 'money'][sequence % 4],
        extraData: `storage-contact-${userId}`, created_at: date, updated_at: date,
    })));
    await qi.bulkInsert('case_opens', rows.map(({ id, userId }) => ({
        id, userId, caseId: 'dust2', storageId: 10000 + id, resultItemId: id, resultColor: 'painted',
        drawTable: 'private-draw-table', clientSeed: 'private-client-seed', created_at: date,
    })));
    await qi.bulkInsert('bonus_history', rows.map(({ id, userId }) => ({
        id, userId, bonusId: `daily:2026-${id}`, created_at: date,
    })));
    await qi.bulkInsert('admin_actions', rows.map(({ id, userId }) => ({
        id, adminId: 3, action: 'user.balance', targetType: 'user', targetId: String(userId),
        payload: id === 119 ? 'legacy-invalid-json' : JSON.stringify({ delta: id }),
        reason: `audit-${userId}-${id}`, created_at: date,
    })));
    await qi.bulkInsert('admin_actions', [{
        id: 121, adminId: 3, action: 'case.update', targetType: 'case', targetId: '1',
        payload: '{}', reason: 'another-target-type', created_at: date,
    }]);
});

test.after(async () => { await sequelize.close(); });

test('the player card route has the admin guards followed by its real rules and handler', () => {
    const app = require('express')();
    require('../src/routes/admin')(app);
    const route = app._router.stack.find((layer) => layer.route && layer.route.path === '/api/admin/user/:id');
    assert.ok(route, 'GET /api/admin/user/:id must be registered');
    assert.equal(route.route.methods.get, true);
    const handlers = route.route.stack.map(({ handle }) => handle);
    assert.deepEqual(handlers.slice(0, 3), [
        require('../src/middleware/rateLimiters').adminLimiter,
        require('../src/middleware/authenticate').authenticate,
        require('../src/middleware/adminOnly').adminOnly,
    ]);
    assert.equal(typeof handlers[3].run, 'function');
    assert.equal(handlers[handlers.length - 1], UsersController.getCard);
});

test('the profile has exactly the allowed fields, including the withdrawal contact', async () => {
    const res = await card();
    assert.equal(res.code, 200);
    assert.deepEqual(Object.keys(res.body.data).sort(), ['profile', 'balanceHistory', 'opens', 'inventory', 'bonuses', 'adminActions'].sort());
    assert.deepEqual(res.body.data.profile, {
        id: 1, login: 'player1', email: 'player1@e.ua', role: 1, balance: '123.45', rank: '9.500000',
        avatar: 4, receiveInfo: 'withdrawal-contact-1', created_at: date.toISOString(),
    });
    assert.doesNotMatch(JSON.stringify(res.body), /private-password-hash|tokenVersion|private-draw-table|private-client-seed|storage-contact/);
});

test('balance history is the newest 50 rows belonging to this player, with change, details and time', async () => {
    const { body } = await card();
    assert.deepEqual(body.data.balanceHistory.map(({ id }) => id), newestIds);
    assert.deepEqual(body.data.balanceHistory[0], {
        id: 119, type: 'admin_adjust', change: '1.19', extraData: 'reason-1-119', created_at: date.toISOString(),
    });
});

test('opens come from the durable audit trail, limited to this player and 50 rows, with legacy price unknown', async () => {
    const { body } = await card();
    assert.deepEqual(body.data.opens.map(({ id }) => id), newestIds);
    assert.deepEqual(body.data.opens[0], {
        id: 119, caseId: 'dust2', caseTitle: 'Dust II', itemId: 119, color: 'painted', pricePaid: null, created_at: date.toISOString(),
    });
});

test('inventory counts cover all this player\'s rows while only the newest 50 items are returned', async () => {
    const { body } = await card();
    assert.deepEqual(body.data.inventory.counts, { inventory: 15, received: 15, waitingtrade: 15, money: 15, upgraded: 0 });
    assert.deepEqual(body.data.inventory.items.map(({ id }) => id), newestIds);
    assert.deepEqual(body.data.inventory.items[0], {
        id: 119, itemId: 119, color: 'painted', caseId: 'dust2', caseTitle: 'Dust II', status: 'money',
        created_at: date.toISOString(), updated_at: date.toISOString(),
    });
});

test('bonus claims contain only the newest 50 claims of this player', async () => {
    const { body } = await card();
    assert.deepEqual(body.data.bonuses.map(({ id }) => id), newestIds);
    assert.deepEqual(body.data.bonuses[0], { id: 119, bonusId: 'daily:2026-119', created_at: date.toISOString() });
});

test('the journal filters both target type and player id, limits to 50 and preserves old payloads', async () => {
    const { body } = await card();
    assert.deepEqual(body.data.adminActions.map(({ id }) => id), newestIds);
    assert.deepEqual(body.data.adminActions[0], {
        id: 119, adminId: 3, action: 'user.balance', targetType: 'user', targetId: '1',
        payload: 'legacy-invalid-json', reason: 'audit-1-119', created_at: date.toISOString(),
    });
    assert.deepEqual(body.data.adminActions[1].payload, { delta: 117 });
});

test('a player without activity has empty histories and all status counts zero, and reading never journals', async () => {
    const [[before]] = await sequelize.query('SELECT COUNT(*) AS n FROM admin_actions');
    const { body, code } = await card('3');
    assert.equal(code, 200);
    assert.deepEqual([body.data.balanceHistory, body.data.opens, body.data.bonuses, body.data.adminActions, body.data.inventory.items], [[], [], [], [], []]);
    assert.deepEqual(body.data.inventory.counts, { inventory: 0, received: 0, waitingtrade: 0, money: 0, upgraded: 0 });
    const [[after]] = await sequelize.query('SELECT COUNT(*) AS n FROM admin_actions');
    assert.equal(after.n, before.n);
});

test('an unknown player answers 422 with the existing admin message through the nullable finder', async (t) => {
    const finder = t.mock.method(UserService, 'findUserById', async () => null);
    const res = await card('999999');
    assert.equal(res.code, 422);
    assert.deepEqual(res.body, { status: 422, message: MESSAGE.USER.NOT_EXIST });
    assert.equal(finder.mock.calls.length, 1);
    assert.equal(finder.mock.calls[0].arguments[0], 999999);
});

test('malformed, array and out-of-range player ids are refused before a lookup', async (t) => {
    const finder = t.mock.method(UserService, 'findUserById', async () => { throw new Error('lookup must not run'); });
    const invalid = ['', '0', '-1', '01', '1.2', '1e2', '2147483648', '9'.repeat(200), '1\nforged', null, undefined, ['1'], ['1', '2'], {}];
    for (const id of invalid) {
        const res = await card(id === undefined ? null : id);
        assert.equal(res.code, 422, JSON.stringify(id));
        assert.equal(res.body.message, MESSAGE.VALIDATOR.ERROR, JSON.stringify(id));
    }
    assert.equal(finder.mock.calls.length, 0);
    for (const id of ['1', '2147483647']) {
        const req = { params: { id } };
        await Promise.all(UsersController.validate('getCard').map((rule) => rule.run(req)));
        assert.equal(validationResult(req).isEmpty(), true, id);
    }
});

test('a database failure is a logged generic 500 and never looks like an unknown player', async (t) => {
    t.mock.method(UserService, 'findUserById', async () => { throw new Error('private database address'); });
    const logged = t.mock.method(console, 'error', () => {});
    const res = await card();
    assert.equal(res.code, 500);
    assert.deepEqual(res.body, { status: 500, message: MESSAGE.SERVER.ERROR });
    assert.equal(logged.mock.calls.length, 1);
});

test('an activity query failure answers a generic 500 instead of a partial or empty card', async (t) => {
    t.mock.method(require('../src/models/storage'), 'findAll', async () => { throw new Error('private SQL parameters'); });
    const logged = t.mock.method(console, 'error', () => {});
    const res = await card();
    assert.equal(res.code, 500);
    assert.deepEqual(res.body, { status: 500, message: MESSAGE.SERVER.ERROR });
    assert.equal(logged.mock.calls.length, 1);
});

test('the newest-row queries have userId/id indexes instead of sorting every row of a player', async () => {
    for (const table of ['storage', 'balance_history', 'bonus_history', 'case_opens']) {
        const indexes = await sequelize.getQueryInterface().showIndex(table);
        assert.ok(indexes.some(({ fields }) => fields.map(({ attribute }) => attribute).join(',') === 'userId,id'), table);
    }
});

test('new opens store the locked price actually charged, including a sale, independently of later case edits', async (t) => {
    const allCases = require('../src/constant/cases/_all');
    itemHash = Object.fromEntries(allCases.dust2.ITEMS.map((item) => [item.id, JSON.stringify({
        name: `Item ${item.id}`, rare: item.rare, pricesInCredits: JSON.stringify({ default: 10, painted: 20 }),
    })]));
    await sequelize.query("UPDATE users SET balance = 1000 WHERE id = 3");
    await sequelize.query("UPDATE cases SET price = 100, discount = 37, openLimit = -1 WHERE id = 'dust2'");
    const CaseService = require('../src/services/case');
    const originalFind = CaseService.findCaseById;
    t.mock.method(CaseService, 'findCaseById', async (id, options) => {
        const row = await originalFind(id, options);
        if (!options) {
            await sequelize.query("UPDATE cases SET discount = 29 WHERE id = 'dust2'");
        }
        return row;
    });
    const CaseController = require('../src/controllers/case');
    const req = { body: { id: 'dust2', count: 2 }, user: { profile: { user_id: 3 } } };
    await Promise.all(CaseController.validate('openCaseById').map((rule) => rule.run(req)));
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await CaseController.openCaseById(req, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.data.length, 2);
    assert.equal(Number(res.body.balance), 942);
    await sequelize.query("UPDATE cases SET price = 999, discount = 0 WHERE id = 'dust2'");
    const result = await card('3');
    assert.equal(result.code, 200);
    assert.deepEqual(result.body.data.opens.map(({ pricePaid }) => Number(pricePaid)), [29, 29]);
});
