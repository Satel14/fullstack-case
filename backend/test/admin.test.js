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
