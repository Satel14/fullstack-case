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
