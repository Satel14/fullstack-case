const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const setup = async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const hash = await bcrypt.hash('secret123', 10);
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', ?, 'player@e.ua', 0, 0, 1)",
        { replacements: [hash] },
    );
    return sequelize;
};

const login = (password) => new Promise((resolve) => {
    let handler;
    require('../src/auth/login')({ post: (path, ...chain) => { handler = chain[chain.length - 1]; } });
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler({ body: { login: 'player', password } }, res);
});

const authenticateWith = (token) => new Promise((resolve) => {
    const { authenticate } = require('../src/middleware/authenticate');
    const req = { headers: { authorization: `Bearer ${token}` }, method: 'GET', url: '/api/profile/get' };
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ accepted: false, code: this.statusCode, payload }); },
    };
    authenticate(req, res, () => resolve({ accepted: true, profile: req.user.profile }));
});

const resetPasswordTo = async (password) => {
    const PasswordResetService = require('../src/services/passwordReset');
    const token = await PasswordResetService.issueToken(1);
    const hash = await bcrypt.hash(password, 10);
    assert.strictEqual(await PasswordResetService.resetPassword(token, hash), true);
};

test('a login token works until the password is reset, and a fresh login works after', async () => {
    await setup();

    const before = await login('secret123');
    assert.strictEqual(before.code, 200);
    const accepted = await authenticateWith(before.payload.jwt);
    assert.strictEqual(accepted.accepted, true);
    assert.ok(!('user_tokenVersion' in accepted.profile), 'the token version must not be exposed in the profile');
    assert.ok(!('user_tokenVersion' in before.payload.user), 'the token version must not be exposed by login');

    await resetPasswordTo('brand-new-1');

    const stale = await authenticateWith(before.payload.jwt);
    assert.strictEqual(stale.accepted, false);
    assert.strictEqual(stale.code, 403);

    const after = await login('brand-new-1');
    assert.strictEqual((await authenticateWith(after.payload.jwt)).accepted, true);
});

test('a token signed before versions existed keeps working until the first reset', async () => {
    await setup();
    const jwtOptions = require('../src/auth/jwtConfig');
    const legacy = jwt.sign({ id: 1 }, jwtOptions.secretOrKey, jwtOptions.signOptions);

    assert.strictEqual((await authenticateWith(legacy)).accepted, true);
    await resetPasswordTo('brand-new-1');
    assert.strictEqual((await authenticateWith(legacy)).accepted, false);
});

test('a socket token resolves to its user only while it is current', async () => {
    await setup();
    const { userFromToken, sessionUser } = require('../src/auth/token');
    const { payload } = await login('secret123');
    const decoded = jwt.decode(payload.jwt);

    const user = await userFromToken(payload.jwt);
    assert.strictEqual(user.user_login, 'player');
    assert.ok(await sessionUser(1, decoded.ver));
    assert.strictEqual(await userFromToken('not-a-jwt'), null);

    await resetPasswordTo('brand-new-1');

    assert.strictEqual(await userFromToken(payload.jwt), null);
    assert.strictEqual(await sessionUser(1, decoded.ver), null, 'an open socket must lose its session too');
});

test('the profile edit endpoint can no longer change the password', async () => {
    const sequelize = await setup();
    const UserService = require('../src/services/user');
    const MESSAGE = require('../src/constant/responseMessages');
    const [[before]] = await sequelize.query("SELECT password FROM users WHERE login = 'player'");

    await assert.rejects(() => UserService.editUser({ user_password: 'hijacked' }, 1), { message: MESSAGE.USER.CANT_UPDATE_FIELD });

    const [[after]] = await sequelize.query("SELECT password FROM users WHERE login = 'player'");
    assert.strictEqual(after.password, before.password);
});

test('login and registration refuse credentials that are not plain strings', async () => {
    const sequelize = await setup();
    const MESSAGE = require('../src/constant/responseMessages');
    const handlers = {};
    const app = { post: (path, ...chain) => { handlers[path] = chain[chain.length - 1]; } };
    require('../src/auth/login')(app);
    require('../src/auth/register')(app);
    const call = (path, body) => new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(payload) { resolve({ code: this.statusCode, payload }); },
        };
        handlers[path]({ body }, res);
    });

    for (const body of [
        { login: ['player', 'other'], password: 'secret123' },
        { login: { like: '%' }, password: 'secret123' },
        { login: 'player', password: ['secret123'] },
    ]) {
        const result = await call('/api/profile/login', body);
        assert.strictEqual(result.code, 401, JSON.stringify(body));
        assert.strictEqual(result.payload.message, MESSAGE.AUTH.EMPTY_DATA);
    }

    const registered = await call('/api/profile/register', {
        login: 'newbie1', password: 'secret123', email: ['a@e.ua', 'b@e.ua'],
    });
    assert.strictEqual(registered.code, 401);
    const [[count]] = await sequelize.query("SELECT COUNT(*) AS n FROM users WHERE login = 'newbie1'");
    assert.strictEqual(Number(count.n), 0);
});
