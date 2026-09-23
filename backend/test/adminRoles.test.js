const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');
const ROLES = require('../src/constant/enums/roles');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const makeUser = async (sequelize, login, role) => {
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES (?, 'x', ?, 1000, 0, ?)",
        { replacements: [login, `${login}@e.ua`, role] },
    );
};

const setRole = (params, body, adminId) => new Promise((resolve) => {
    const UsersController = require('../src/controllers/admin/users');
    const req = { params, body, user: { profile: { user_id: adminId } } };
    const res = {
        statusCode: null,
        status(c) { this.statusCode = c; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    UsersController.setRole(req, res);
});

test('an administrator cannot change the role of another administrator', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await makeUser(sequelize, 'boss', ROLES.ADMINISTRATOR);
    await makeUser(sequelize, 'peer', ROLES.ADMINISTRATOR);
    const MESSAGE = require('../src/constant/responseMessages');

    for (const role of [ROLES.BANNED, ROLES.BANNED_CHAT, ROLES.NORMAL, ROLES.FAMOUS]) {
        const result = await setRole({ id: '2' }, { role }, 1);
        assert.strictEqual(result.code, 422, `role ${role}: ${JSON.stringify(result.payload)}`);
        assert.strictEqual(result.payload.message, MESSAGE.ADMIN.TARGET_ADMIN_FORBIDDEN);
    }

    const [[peer]] = await sequelize.query("SELECT role FROM users WHERE login = 'peer'");
    assert.strictEqual(Number(peer.role), ROLES.ADMINISTRATOR);

    const [[journal]] = await sequelize.query('SELECT COUNT(*) AS n FROM admin_actions');
    assert.strictEqual(Number(journal.n), 0);
});

test('an administrator can still change the role of a player', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await makeUser(sequelize, 'boss', ROLES.ADMINISTRATOR);
    await makeUser(sequelize, 'player', ROLES.NORMAL);

    const result = await setRole({ id: '2' }, { role: ROLES.BANNED_CHAT }, 1);
    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));

    const [[player]] = await sequelize.query("SELECT role FROM users WHERE login = 'player'");
    assert.strictEqual(Number(player.role), ROLES.BANNED_CHAT);
});
