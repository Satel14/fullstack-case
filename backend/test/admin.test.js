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

test('adminOnly blocks every non-administrator role and passes only the administrator', async () => {
    const { adminOnly } = require('../src/middleware/adminOnly');
    const MESSAGE = require('../src/constant/responseMessages');

    const call = (profile) => new Promise((resolve) => {
        const req = { user: profile === undefined ? undefined : { profile } };
        const res = {
            statusCode: null,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(payload) { this.body = payload; resolve({ blocked: true, res: this }); },
        };
        adminOnly(req, res, () => resolve({ blocked: false, res }));
    });

    for (const role of [ROLES.NORMAL, ROLES.FAMOUS, ROLES.BANNED]) {
        const rejected = await call({ user_role: role });
        assert.strictEqual(rejected.blocked, true, `role ${role} must never reach an admin handler`);
        assert.strictEqual(rejected.res.statusCode, 403, `role ${role} must be rejected with 403`);
        assert.strictEqual(rejected.res.body.message, MESSAGE.ADMIN.NOT_ADMIN);
        assert.strictEqual(rejected.res.body.status, 403);
    }

    const admin = await call({ user_role: ROLES.ADMINISTRATOR });
    assert.strictEqual(admin.blocked, false, 'the administrator role must pass through');

    const anonymous = await call(undefined);
    assert.strictEqual(anonymous.blocked, true, 'an unauthenticated request must never reach an admin handler');
    assert.strictEqual(anonymous.res.statusCode, 403);
    assert.strictEqual(anonymous.res.body.message, MESSAGE.ADMIN.NOT_ADMIN);
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

    await assert.rejects(() => migrator.down({ to: '20260922000500-balance-admin-adjust.js' }), /admin_adjust/i);

    const [type] = await sequelize.query("SHOW COLUMNS FROM balance_history WHERE Field = 'type'");
    assert.match(type[0].Type, /admin_adjust/);
});

test('admin_adjust is removed cleanly when nothing uses it', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { createMigrator } = require('../src/db/migrator');
    const migrator = createMigrator(sequelize, { quiet: true });

    await migrator.down({ to: '20260922000500-balance-admin-adjust.js' });

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

const MONEY_ROUTES = [
    ['case.js', 'post', '/api/case/open'],
    ['storage.js', 'put', '/api/storage/sell/:id'],
    ['storage.js', 'put', '/api/storage/receive/:id'],
    ['user.js', 'put', '/api/profile/sendmoney'],
    ['user.js', 'post', '/api/profile/deposit'],
    ['user.js', 'post', '/api/profile/reset'],
    ['promocode.js', 'put', '/api/promocode/use'],
    ['bonusHistory.js', 'post', '/api/bonus/activate'],
];

test('every money route keeps notBanned after authenticate', () => {
    const fs = require('node:fs');
    const path = require('node:path');

    const sources = new Map();
    const readRouteFile = (file) => {
        if (!sources.has(file)) {
            sources.set(file, fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', file), 'utf8'));
        }
        return sources.get(file);
    };

    for (const [file, method, routePath] of MONEY_ROUTES) {
        const source = readRouteFile(file);

        assert.match(
            source,
            /const\s*\{\s*notBanned\s*\}\s*=\s*require\(['"]\.\.\/middleware\/adminOnly['"]\)/,
            `${file} no longer imports notBanned`,
        );

        const registration = new RegExp(`app\\.${method}\\(\\s*['"\`]${routePath}['"\`][^\\n]*`);
        const [line] = source.match(registration) || [];
        assert.ok(line, `${file}: no ${method.toUpperCase()} ${routePath} registration found`);

        const authAt = line.indexOf('authenticate');
        const notBannedAt = line.indexOf('notBanned');

        assert.ok(authAt !== -1, `${method.toUpperCase()} ${routePath} is missing authenticate: ${line}`);
        assert.ok(notBannedAt !== -1, `${method.toUpperCase()} ${routePath} is missing notBanned: ${line}`);
        assert.ok(
            notBannedAt > authAt,
            `${method.toUpperCase()} ${routePath} must list notBanned after authenticate: ${line}`,
        );
    }
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

test('a failed journal insert rolls back the case update', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await makeUser(sequelize, { login: 'boss', role: ROLES.ADMINISTRATOR });

    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES ('t9', 'T', 100, 0, 1, 1, 0, 'weapon', -1)",
    );

    const AdminActionService = require('../src/services/adminAction');
    const original = AdminActionService.record;
    AdminActionService.record = async () => { throw new Error('journal down'); };

    let code;
    try {
        const CasesController = require('../src/controllers/admin/cases');
        code = await new Promise((resolve) => {
            const req = {
                params: { id: 't9' },
                body: { case_price: 250, case_published: 0 },
                user: { profile: { user_id: 1 } },
            };
            const res = {
                statusCode: null,
                status(c) { this.statusCode = c; return this; },
                json() { resolve(this.statusCode); },
            };
            CasesController.update(req, res);
        });
    } finally {
        AdminActionService.record = original;
    }

    assert.strictEqual(code, 400);

    const [rows] = await sequelize.query("SELECT price, published FROM cases WHERE id = 't9'");
    assert.strictEqual(Number(rows[0].price), 100);
    assert.strictEqual(Number(rows[0].published), 1);

    const [journal] = await sequelize.query('SELECT COUNT(*) AS n FROM admin_actions');
    assert.strictEqual(Number(journal[0].n), 0);
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

test('user search is paged and never returns password hashes', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await makeUser(sequelize, { login: 'alpha' });
    await makeUser(sequelize, { login: 'beta' });
    await makeUser(sequelize, { login: 'alphabet' });

    const UserService = require('../src/services/user');

    const all = await UserService.getUsersPaged({ limit: 10, offset: 0 });
    assert.strictEqual(all.count, 3);
    assert.ok(all.rows.every((r) => r.user_password === undefined));

    const filtered = await UserService.getUsersPaged({ search: 'alpha', limit: 10, offset: 0 });
    assert.strictEqual(filtered.count, 2);

    const paged = await UserService.getUsersPaged({ limit: 1, offset: 0 });
    assert.strictEqual(paged.rows.length, 1);
    assert.strictEqual(paged.count, 3);
});

test('role change rejects unknown roles, the administrator role, and self-targeting', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await makeUser(sequelize, { login: 'boss', role: ROLES.ADMINISTRATOR });
    await makeUser(sequelize, { login: 'victim' });

    const UsersController = require('../src/controllers/admin/users');
    const call = (params, body, adminId) => new Promise((resolve) => {
        const req = { params, body, user: { profile: { user_id: adminId } } };
        const res = {
            statusCode: null,
            status(c) { this.statusCode = c; return this; },
            json(payload) { resolve({ code: this.statusCode, payload }); },
        };
        UsersController.setRole(req, res);
    });

    const unknown = await call({ id: '2' }, { role: 77 }, 1);
    assert.strictEqual(unknown.code, 422);

    const toAdmin = await call({ id: '2' }, { role: ROLES.ADMINISTRATOR }, 1);
    assert.strictEqual(toAdmin.code, 422);

    const self = await call({ id: '1' }, { role: ROLES.BANNED }, 1);
    assert.strictEqual(self.code, 422);

    const ok = await call({ id: '2' }, { role: ROLES.BANNED }, 1);
    assert.strictEqual(ok.code, 200);

    const [rows] = await sequelize.query("SELECT role FROM users WHERE login = 'victim'");
    assert.strictEqual(Number(rows[0].role), ROLES.BANNED);

    const journal = await require('../src/services/adminAction').list({});
    assert.strictEqual(journal[0].action, 'user.role');
});

test('a failed journal insert rolls back the role change', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await makeUser(sequelize, { login: 'boss', role: ROLES.ADMINISTRATOR });
    await makeUser(sequelize, { login: 'victim' });

    const AdminActionService = require('../src/services/adminAction');
    const original = AdminActionService.record;
    AdminActionService.record = async () => { throw new Error('journal down'); };

    let code;
    try {
        const UsersController = require('../src/controllers/admin/users');
        code = await new Promise((resolve) => {
            const req = { params: { id: '2' }, body: { role: ROLES.BANNED }, user: { profile: { user_id: 1 } } };
            const res = {
                statusCode: null,
                status(c) { this.statusCode = c; return this; },
                json() { resolve(this.statusCode); },
            };
            UsersController.setRole(req, res);
        });
    } finally {
        AdminActionService.record = original;
    }

    assert.strictEqual(code, 400);

    const [rows] = await sequelize.query("SELECT role FROM users WHERE login = 'victim'");
    assert.strictEqual(Number(rows[0].role), ROLES.NORMAL);

    const [journal] = await sequelize.query('SELECT COUNT(*) AS n FROM admin_actions');
    assert.strictEqual(Number(journal[0].n), 0);
});

test('setRole rejects malformed input through its validator chain', async () => {
    const UsersController = require('../src/controllers/admin/users');
    const { validationResult } = require('express-validator');

    const runChain = async (params, body) => {
        const req = { params, body, user: { profile: { user_id: 1 } } };
        for (const validator of UsersController.validate('setRole')) {
            await validator.run(req);
        }
        return req;
    };

    const bad = await runChain({ id: 'abc' }, { role: 'xyz' });
    assert.ok(!validationResult(bad).isEmpty());

    const badResult = await new Promise((resolve) => {
        const res = {
            statusCode: null,
            status(c) { this.statusCode = c; return this; },
            json(payload) { resolve({ code: this.statusCode, payload }); },
        };
        UsersController.setRole(bad, res);
    });
    assert.strictEqual(badResult.code, 422);

    const good = await runChain({ id: '2' }, { role: 1 });
    assert.ok(validationResult(good).isEmpty());
});

test('balance correction applies a delta, requires a reason, and refuses self and overdraft', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await makeUser(sequelize, { login: 'boss', role: ROLES.ADMINISTRATOR, balance: 500 });
    await makeUser(sequelize, { login: 'target', balance: 100 });

    const UsersController = require('../src/controllers/admin/users');
    const call = (params, body, adminId) => new Promise((resolve) => {
        const req = { params, body, user: { profile: { user_id: adminId } } };
        const res = {
            statusCode: null,
            status(c) { this.statusCode = c; return this; },
            json(payload) { resolve({ code: this.statusCode, payload }); },
        };
        UsersController.adjustBalance(req, res);
    });

    const noReason = await call({ id: '2' }, { delta: 50 }, 1);
    assert.strictEqual(noReason.code, 422);

    const selfAdjust = await call({ id: '1' }, { delta: 50, reason: 'nope' }, 1);
    assert.strictEqual(selfAdjust.code, 422);

    const overdraft = await call({ id: '2' }, { delta: -500, reason: 'too much' }, 1);
    assert.strictEqual(overdraft.code, 422);

    const credit = await call({ id: '2' }, { delta: 25.5, reason: 'compensation' }, 1);
    assert.strictEqual(credit.code, 200);

    const [rows] = await sequelize.query("SELECT balance FROM users WHERE login = 'target'");
    assert.strictEqual(Number(rows[0].balance), 125.5);

    const [history] = await sequelize.query("SELECT type, balanceChange, extraData FROM balance_history WHERE userId = 2");
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].type, 'admin_adjust');
    assert.strictEqual(Number(history[0].balanceChange), 25.5);

    const journal = await require('../src/services/adminAction').list({});
    assert.strictEqual(journal[0].action, 'user.balance');
    assert.strictEqual(journal[0].reason, 'compensation');
    assert.strictEqual(journal[0].payload.delta, 25.5);
});

test('a failed balance correction leaves no trace', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await makeUser(sequelize, { login: 'boss', role: ROLES.ADMINISTRATOR });
    await makeUser(sequelize, { login: 'target', balance: 10 });

    const UsersController = require('../src/controllers/admin/users');
    await new Promise((resolve) => {
        const req = { params: { id: '2' }, body: { delta: -99, reason: 'overdraft' }, user: { profile: { user_id: 1 } } };
        const res = { status(c) { this.statusCode = c; return this; }, json() { resolve(); } };
        UsersController.adjustBalance(req, res);
    });

    const [balance] = await sequelize.query("SELECT balance FROM users WHERE login = 'target'");
    assert.strictEqual(Number(balance[0].balance), 10);

    const [history] = await sequelize.query('SELECT COUNT(*) AS n FROM balance_history');
    assert.strictEqual(Number(history[0].n), 0);

    const [journal] = await sequelize.query('SELECT COUNT(*) AS n FROM admin_actions');
    assert.strictEqual(Number(journal[0].n), 0);
});

test('a failure after the balance write rolls back every table', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await makeUser(sequelize, { login: 'boss', role: ROLES.ADMINISTRATOR });
    await makeUser(sequelize, { login: 'target', balance: 100 });

    const AdminActionService = require('../src/services/adminAction');
    const original = AdminActionService.record;
    AdminActionService.record = async () => { throw new Error('journal down'); };

    try {
        const UsersController = require('../src/controllers/admin/users');
        await new Promise((resolve) => {
            const req = { params: { id: '2' }, body: { delta: 25, reason: 'test' }, user: { profile: { user_id: 1 } } };
            const res = { status(c) { this.statusCode = c; return this; }, json() { resolve(); } };
            UsersController.adjustBalance(req, res);
        });
    } finally {
        AdminActionService.record = original;
    }

    const [balance] = await sequelize.query("SELECT balance FROM users WHERE login = 'target'");
    assert.strictEqual(Number(balance[0].balance), 100);

    const [history] = await sequelize.query('SELECT COUNT(*) AS n FROM balance_history');
    assert.strictEqual(Number(history[0].n), 0);

    const [journal] = await sequelize.query('SELECT COUNT(*) AS n FROM admin_actions');
    assert.strictEqual(Number(journal[0].n), 0);
});

test('adjustBalance rejects malformed input through its validator chain', async () => {
    const UsersController = require('../src/controllers/admin/users');
    const { validationResult } = require('express-validator');

    const runChain = async (params, body) => {
        const req = { params, body, user: { profile: { user_id: 1 } } };
        for (const validator of UsersController.validate('adjustBalance')) {
            await validator.run(req);
        }
        return req;
    };

    const badId = await runChain({ id: 'abc' }, { delta: 25, reason: 'ok' });
    assert.ok(!validationResult(badId).isEmpty());

    const missingReason = await runChain({ id: '2' }, { delta: 25 });
    assert.ok(!validationResult(missingReason).isEmpty());

    const tooLarge = await runChain({ id: '2' }, { delta: 2000000, reason: 'ok' });
    assert.ok(!validationResult(tooLarge).isEmpty());

    const badResult = await new Promise((resolve) => {
        const res = {
            statusCode: null,
            status(c) { this.statusCode = c; return this; },
            json(payload) { resolve({ code: this.statusCode, payload }); },
        };
        UsersController.adjustBalance(badId, res);
    });
    assert.strictEqual(badResult.code, 422);

    const good = await runChain({ id: '2' }, { delta: 25, reason: 'ok' });
    assert.ok(validationResult(good).isEmpty());
});

test('grantAdmin promotes by login, is idempotent, and journals', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await makeUser(sequelize, { login: 'futureboss' });

    const { execFileSync } = require('node:child_process');
    const path = require('node:path');
    const script = path.join(__dirname, '..', 'scripts', 'grantAdmin.js');
    const env = { ...process.env, NODE_ENV: 'development', DB_NAME: 'case_test' };

    const first = execFileSync('node', [script, 'futureboss'], { env, encoding: 'utf8' });
    assert.match(first, /is now an administrator/);

    const [rows] = await sequelize.query("SELECT role FROM users WHERE login = 'futureboss'");
    assert.strictEqual(Number(rows[0].role), ROLES.ADMINISTRATOR);

    const second = execFileSync('node', [script, 'futureboss'], { env, encoding: 'utf8' });
    assert.match(second, /already an administrator/);

    const journal = await require('../src/services/adminAction').list({});
    assert.strictEqual(journal.filter((j) => j.action === 'user.grantAdmin').length, 1);
});

test('an unpublished case cannot be opened', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await makeUser(sequelize, { login: 'player', balance: 10000 });

    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES "
        + "('offline', 'O', 100, 0, 1, 0, 0, 'weapon', -1), ('online', 'N', 100, 0, 1, 1, 5, 'weapon', 5)",
    );

    const managerPath = require.resolve('../src/redis/manager');
    require.cache[managerPath] = {
        id: managerPath,
        filename: managerPath,
        loaded: true,
        exports: { getAllDataHashWithKey: async () => ({}) },
    };

    const CaseController = require('../src/controllers/case');
    const MESSAGE = require('../src/constant/responseMessages');

    const open = (id) => new Promise((resolve) => {
        const req = { body: { id, count: 1 }, user: { profile: { user_id: 1 } } };
        const res = {
            statusCode: null,
            status(c) { this.statusCode = c; return this; },
            json(payload) { resolve({ code: this.statusCode, payload }); },
        };
        CaseController.openCaseById(req, res);
    });

    const offline = await open('offline');
    assert.strictEqual(offline.code, 422);
    assert.strictEqual(offline.payload.message, MESSAGE.CASE.NOT_PUBLISHED);

    const online = await open('online');
    assert.strictEqual(online.code, 422);
    assert.strictEqual(
        online.payload.message,
        MESSAGE.CASE.LIMIT_EXCEEDED,
        'a published case must get past the publication gate and be judged on its open limit',
    );

    const [balance] = await sequelize.query("SELECT balance FROM users WHERE login = 'player'");
    assert.strictEqual(Number(balance[0].balance), 10000);
});
