const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcrypt');
const { resetTestDatabase } = require('./helpers/db');
const ROLES = require('../src/constant/enums/roles');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const makeUser = async (sequelize, { login, role = ROLES.NORMAL, balance = 1000 }) => {
    const hash = await bcrypt.hash('secret123', 10);
    const [result] = await sequelize.query(
        'INSERT INTO users (login, password, email, balance, `rank`, role) VALUES (?, ?, ?, ?, 0, ?)',
        { replacements: [login, hash, `${login}@e.ua`, balance, role] },
    );
    return result;
};

test('roles enum separates ADMINISTRATOR from FAMOUS', () => {
    assert.notStrictEqual(ROLES.ADMINISTRATOR, ROLES.FAMOUS);
    assert.strictEqual(ROLES.BANNED, -1);
    assert.strictEqual(ROLES.NORMAL, 1);
});

test('notBanned rejects a banned user and passes everyone else', async () => {
    const { notBanned } = require('../src/middleware/adminOnly');

    const call = (role) => new Promise((resolve) => {
        const req = { user: { profile: { user_role: role } } };
        const res = {
            statusCode: null,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(payload) { this.body = payload; resolve({ blocked: true, res: this }); },
        };
        notBanned(req, res, () => resolve({ blocked: false, res }));
    });

    const banned = await call(ROLES.BANNED);
    assert.strictEqual(banned.blocked, true);
    assert.strictEqual(banned.res.statusCode, 403);

    for (const role of [ROLES.NORMAL, ROLES.FAMOUS, ROLES.ADMINISTRATOR, ROLES.BANNED_CHAT]) {
        const passed = await call(role);
        assert.strictEqual(passed.blocked, false, `role ${role} should pass`);
    }
});

test('admin_actions table and admin_adjust enum value exist', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    const [cols] = await sequelize.query('SHOW COLUMNS FROM admin_actions');
    const byField = Object.fromEntries(cols.map((c) => [c.Field, c]));
    assert.match(byField.id.Extra, /auto_increment/i);
    assert.match(byField.adminId.Type, /int/i);
    assert.match(byField.action.Type, /varchar\(64\)/i);
    assert.match(byField.targetType.Type, /varchar\(32\)/i);
    assert.match(byField.targetId.Type, /varchar\(64\)/i);
    assert.match(byField.payload.Type, /text/i);
    assert.match(byField.reason.Type, /varchar\(255\)/i);

    const [idx] = await sequelize.query('SHOW INDEX FROM admin_actions');
    const names = new Set(idx.map((i) => i.Key_name));
    assert.ok(names.has('admin_actions_admin_id_created_at'));
    assert.ok(names.has('admin_actions_target_type_target_id'));

    const [type] = await sequelize.query("SHOW COLUMNS FROM balance_history WHERE Field = 'type'");
    assert.match(type[0].Type, /admin_adjust/);
});

test('admin_adjust cannot be removed while rows still use it', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { createMigrator } = require('../src/db/migrator');
    const migrator = createMigrator(sequelize, { quiet: true });

    await sequelize.query(
        "INSERT INTO balance_history (userId, type, balanceChange, extraData, created_at) VALUES (1, 'admin_adjust', 5.00, 'test', NOW())",
    );

    await assert.rejects(() => migrator.down(), /admin_adjust/i);

    const [type] = await sequelize.query("SHOW COLUMNS FROM balance_history WHERE Field = 'type'");
    assert.match(type[0].Type, /admin_adjust/);
});

test('admin_adjust is removed cleanly when nothing uses it', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { createMigrator } = require('../src/db/migrator');
    const migrator = createMigrator(sequelize, { quiet: true });

    await migrator.down();

    const [type] = await sequelize.query("SHOW COLUMNS FROM balance_history WHERE Field = 'type'");
    assert.doesNotMatch(type[0].Type, /admin_adjust/);
    assert.match(type[0].Type, /sendmoney/);
});

test('AdminActionService.list returns a malformed payload as raw text instead of throwing', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const AdminActionService = require('../src/services/adminAction');

    await sequelize.query(
        "INSERT INTO admin_actions (adminId, action, targetType, targetId, payload, reason, created_at) VALUES (1, 'test_action', 'user', '42', 'not-json{', 'test', NOW())",
    );
    await AdminActionService.record({
        adminId: 1, action: 'test_action_2', targetType: 'user', targetId: '43', payload: { ok: true },
    });

    const rows = await AdminActionService.list({});
    assert.strictEqual(rows.length, 2);

    const broken = rows.find((r) => r.action === 'test_action');
    const clean = rows.find((r) => r.action === 'test_action_2');
    assert.strictEqual(broken.payload, 'not-json{');
    assert.deepStrictEqual(clean.payload, { ok: true });
});

const collectRoutes = (stack, prefix = '') => stack.flatMap((layer) => {
    if (layer.route) {
        return [{
            path: prefix + layer.route.path,
            guards: layer.route.stack.map((s) => s.name),
        }];
    }
    if (layer.handle && layer.handle.stack) {
        return collectRoutes(layer.handle.stack, prefix);
    }
    return [];
});

test('every /api/admin route carries authenticate and adminOnly', () => {
    const express = require('express');
    const app = express();
    require('../src/routes/admin')(app);

    const adminRoutes = collectRoutes(app._router.stack);

    assert.ok(adminRoutes.length > 0, 'no /api/admin routes are registered');

    for (const route of adminRoutes) {
        assert.ok(
            route.guards.includes('authenticate'),
            `${route.path} is missing authenticate (guards: ${route.guards.join(', ')})`,
        );
        assert.ok(
            route.guards.includes('adminOnly'),
            `${route.path} is missing adminOnly (guards: ${route.guards.join(', ')})`,
        );
    }
});

test('collectRoutes reaches routes mounted through a nested router', () => {
    const express = require('express');
    const app = express();
    const nested = express.Router();

    function authenticate(req, res, next) { next(); }
    function handler(req, res) { res.end(); }

    nested.get('/unguarded', authenticate, handler);
    app.use('/api/admin', nested);

    const routes = collectRoutes(app._router.stack);

    assert.strictEqual(routes.length, 1);
    assert.ok(routes[0].guards.includes('authenticate'));
    assert.ok(
        !routes[0].guards.includes('adminOnly'),
        'the nested route was expected to be missing adminOnly for this test to prove anything',
    );
});

test('the admin router is mounted in routes.js', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'routes.js'), 'utf8');
    assert.match(source, /require\(["'].\/src\/routes\/admin["']\)\(app\)/);
});

test('case update writes the case and journals the change', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await makeUser(sequelize, { login: 'boss', role: ROLES.ADMINISTRATOR });

    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES ('t1', 'T', 100, 0, 1, 1, 0, 'weapon', -1)",
    );

    const CaseService = require('../src/services/case');
    const AdminActionService = require('../src/services/adminAction');

    const updated = await CaseService.updateCaseFields('t1', { case_price: 250, case_published: 0 });
    assert.strictEqual(Number(updated.case_price), 250);
    assert.strictEqual(Number(updated.case_published), 0);

    await AdminActionService.record({
        adminId: 1, action: 'case.update', targetType: 'case', targetId: 't1',
        payload: { before: { price: 100 }, after: { price: 250 } }, reason: 'rebalance',
    });

    const journal = await AdminActionService.list({});
    assert.strictEqual(journal.length, 1);
    assert.strictEqual(journal[0].action, 'case.update');
    assert.strictEqual(journal[0].targetId, 't1');
    assert.deepStrictEqual(journal[0].payload.after, { price: 250 });
});

test('case update ignores fields that are not editable', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES ('t2', 'T', 100, 0, 1, 1, 7, 'weapon', -1)",
    );

    const CaseService = require('../src/services/case');
    const updated = await CaseService.updateCaseFields('t2', { case_openedCount: 999, case_price: 150 });

    assert.strictEqual(Number(updated.case_openedCount), 7);
    assert.strictEqual(Number(updated.case_price), 150);
});

test('getAllCases filters unpublished by default and includes them on request', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES ('pub', 'P', 10, 0, 1, 1, 0, 'weapon', -1), ('unpub', 'U', 20, 0, 1, 0, 0, 'weapon', -1)",
    );

    const CaseService = require('../src/services/case');
    const publicOnly = await CaseService.getAllCases();
    assert.deepStrictEqual(publicOnly.map((c) => c.case_id), ['pub']);

    const all = await CaseService.getAllCases(true);
    assert.deepStrictEqual(all.map((c) => c.case_id).sort(), ['pub', 'unpub']);
});
