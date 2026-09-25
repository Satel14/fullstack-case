const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcrypt');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

const welcomes = [];
const mailPath = require.resolve('../src/modules/mailSender');
require.cache[mailPath] = {
    id: mailPath,
    filename: mailPath,
    loaded: true,
    exports: {
        isEnabled: () => true,
        userRegistered: (mailTo, data) => { welcomes.push({ mailTo, login: data.login }); },
        passwordResetLink: () => {},
    },
};

const MESSAGE = require('../src/constant/responseMessages');

const handlers = {};
const app = { post: (path, ...chain) => { handlers[path] = chain[chain.length - 1]; } };
require('../src/auth/register')(app);
require('../src/auth/login')(app);

const call = (path, body) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handlers[path]({ body }, res);
});

const register = (body) => call('/api/profile/register', {
    login: 'newbie', password: 'secret123', email: 'newbie@e.ua', avatar: 1, ...body,
});

const setup = async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    welcomes.length = 0;
    const hash = await bcrypt.hash('secret123', 10);
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('Satel7', ?, 'admin@e.ua', 0, 0, 4)",
        { replacements: [hash] },
    );
    return sequelize;
};

const userCount = async (sequelize) => {
    const [[row]] = await sequelize.query('SELECT COUNT(*) AS n FROM users');
    return Number(row.n);
};

test('a login outside 3 to 32 Latin letters, digits, dots, hyphens and underscores is refused', async () => {
    const sequelize = await setup();

    for (const login of [
        'Satel7 ',
        ' Satel7',
        '   ',
        '\u0405atel7',
        '\u202E7letaS',
        'Sat\u200Bel7',
        'Satel7\n',
        'Sat el7',
        'ab',
        'a'.repeat(33),
        'Satel7 - you won 5000, confirm at https://evil.example',
        'evil://x',
        'гравець',
    ]) {
        const result = await register({ login });
        assert.strictEqual(result.code, 422, JSON.stringify(login));
        assert.strictEqual(result.payload.message, MESSAGE.AUTH.LOGIN_INVALID, JSON.stringify(login));
    }

    assert.strictEqual(await userCount(sequelize), 1);
    assert.deepStrictEqual(welcomes, []);
});

test('a password reset-password would refuse is refused at registration too', async () => {
    const sequelize = await setup();

    for (const password of ['a', '12345', 'ж'.repeat(37), 'x'.repeat(73)]) {
        const result = await register({ password });
        assert.strictEqual(result.code, 422, `${password.length} characters`);
        assert.strictEqual(result.payload.message, MESSAGE.AUTH.PASSWORD_INVALID);
    }

    assert.strictEqual(await userCount(sequelize), 1);
    assert.deepStrictEqual(welcomes, []);

    const boundary = 'ж'.repeat(36);
    const accepted = await register({ password: boundary });
    assert.strictEqual(accepted.code, 200, JSON.stringify(accepted.payload));
    const signedIn = await call('/api/profile/login', { login: 'newbie', password: boundary });
    assert.strictEqual(signedIn.code, 200);
});

test('a login within the rule registers and signs in, and lookalike case variants still collide', async () => {
    const sequelize = await setup();

    const result = await register({ login: 'New_player.1-x' });
    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.ok(result.payload.jwt);
    assert.strictEqual(result.payload.user.user_login, 'New_player.1-x');

    const collision = await register({ login: 'satel7', email: 'other@e.ua' });
    assert.strictEqual(collision.code, 401);
    assert.strictEqual(collision.payload.message, MESSAGE.AUTH.USER_IS_EXIST);
    assert.strictEqual(await userCount(sequelize), 2);
});

test('an existing account whose login predates the rule still signs in', async () => {
    const sequelize = await setup();
    const hash = await bcrypt.hash('secret123', 10);
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('Старий гравець ', ?, 'old@e.ua', 0, 0, 1)",
        { replacements: [hash] },
    );

    const result = await call('/api/profile/login', { login: 'Старий гравець ', password: 'secret123' });
    assert.strictEqual(result.code, 200);
    assert.strictEqual(result.payload.user.user_login, 'Старий гравець ');
});
