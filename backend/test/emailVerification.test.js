const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
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

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const pendingRows = async (sequelize) => {
    const [rows] = await sequelize.query('SELECT * FROM email_verifications ORDER BY id');
    return rows;
};

const users = async (sequelize) => {
    const [rows] = await sequelize.query('SELECT id, login, email, password, avatar FROM users ORDER BY id');
    return rows;
};

const fresh = async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    return sequelize;
};

const pending = (overrides = {}) => ({
    login: 'newbie', email: 'newbie@e.ua', passwordHash: '$2b$10$abcdefghijklmnopqrstuuJ8m3Yb6g4Wn1cXk2Lq3Zr4Vt5Sx6Ay', avatar: 2, ...overrides,
});

test('a pending registration stores only the hash of its token and expires in 24 hours', async () => {
    const sequelize = await fresh();
    const Service = require('../src/services/emailVerification');
    const now = new Date('2026-10-13T10:00:00Z');

    const token = await Service.createPending(pending(), now);

    assert.match(token, /^[0-9a-f]{64}$/);
    const [row] = await pendingRows(sequelize);
    assert.strictEqual(row.tokenHash, sha256(token));
    assert.ok(!JSON.stringify(row).includes(token));
    assert.strictEqual(row.login, 'newbie');
    assert.strictEqual(row.email, 'newbie@e.ua');
    const stored = await require('../src/models/emailVerification').findOne();
    assert.strictEqual(stored.ev_expiresAt.getTime() - now.getTime(), Service.TOKEN_TTL_MS);
    assert.strictEqual(stored.ev_usedAt, null);
    assert.deepStrictEqual(await users(sequelize), []);
});

test('confirming creates the account once and uses up every pending registration of the address', async () => {
    const sequelize = await fresh();
    const Service = require('../src/services/emailVerification');
    const older = await Service.createPending(pending({ login: 'first' }));
    const token = await Service.createPending(pending());

    const result = await Service.confirm(token);

    assert.strictEqual(result.outcome, 'created');
    const created = await users(sequelize);
    assert.strictEqual(created.length, 1);
    assert.strictEqual(created[0].id, result.userId);
    assert.deepStrictEqual(
        { login: created[0].login, email: created[0].email, password: created[0].password, avatar: created[0].avatar },
        { login: 'newbie', email: 'newbie@e.ua', password: pending().passwordHash, avatar: 2 },
    );
    assert.ok((await pendingRows(sequelize)).every((row) => row.usedAt !== null));
    assert.deepStrictEqual(await Service.confirm(token), { outcome: 'invalid' });
    assert.deepStrictEqual(await Service.confirm(older), { outcome: 'invalid' });
});

test('a malformed, unknown or expired token is invalid', async () => {
    await fresh();
    const Service = require('../src/services/emailVerification');
    const now = new Date('2026-10-13T10:00:00Z');
    const token = await Service.createPending(pending(), now);

    for (const bad of [undefined, 42, '', 'abc', 'g'.repeat(64), '0'.repeat(64)]) {
        assert.deepStrictEqual(await Service.confirm(bad, now), { outcome: 'invalid' }, JSON.stringify(bad));
    }
    assert.deepStrictEqual(
        await Service.confirm(token, new Date(now.getTime() + Service.TOKEN_TTL_MS)),
        { outcome: 'invalid' },
    );
});

test('a login or an address taken since the registration is refused and creates nothing', async () => {
    const sequelize = await fresh();
    const Service = require('../src/services/emailVerification');
    const loginToken = await Service.createPending(pending({ login: 'Taken', email: 'a@e.ua' }));
    const emailToken = await Service.createPending(pending({ login: 'other', email: 'owner@e.ua' }));
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('taken', 'x', 'z@e.ua', 0, 0, 1), "
        + "('owner', 'x', 'OWNER@e.ua', 0, 0, 1)",
    );

    assert.deepStrictEqual(await Service.confirm(loginToken), { outcome: 'login-taken' });
    assert.deepStrictEqual(await Service.confirm(emailToken), { outcome: 'email-taken' });
    assert.strictEqual((await users(sequelize)).length, 2);
});

test('two confirmations at once create exactly one account', async () => {
    const sequelize = await fresh();
    const Service = require('../src/services/emailVerification');
    const sameToken = await Service.createPending(pending());
    const sameLogin = await Service.createPending(pending({ email: 'second@e.ua' }));

    const outcomes = await Promise.all([Service.confirm(sameToken), Service.confirm(sameToken), Service.confirm(sameLogin)]);

    assert.strictEqual(outcomes.filter((r) => r.outcome === 'created').length, 1, JSON.stringify(outcomes));
    assert.strictEqual((await users(sequelize)).length, 1);
});

test('registering again clears expired and used pending rows', async () => {
    const sequelize = await fresh();
    const Service = require('../src/services/emailVerification');
    const now = new Date('2026-10-13T10:00:00Z');
    await Service.createPending(pending({ login: 'stale' }), now);
    const used = await Service.createPending(pending({ login: 'used', email: 'used@e.ua' }), now);
    await Service.confirm(used, now);

    await Service.createPending(pending({ login: 'later', email: 'later@e.ua' }), new Date(now.getTime() + Service.TOKEN_TTL_MS + 1));

    assert.deepStrictEqual((await pendingRows(sequelize)).map((row) => row.login), ['later']);
});

const mailLog = [];
const mailPath = require.resolve('../src/modules/mailSender');
const realMail = require('../src/modules/mailSender');
require.cache[mailPath].exports = {
    ...realMail,
    isEnabled: () => true,
    userRegistered: (mailTo, data) => { mailLog.push({ kind: 'welcome', mailTo, ...data }); },
    passwordResetLink: (mailTo, data) => { mailLog.push({ kind: 'reset', mailTo, ...data }); },
    emailConfirmationLink: (mailTo, data) => { mailLog.push({ kind: 'confirm', mailTo, ...data }); },
    registrationAttemptNotice: (mailTo, data) => { mailLog.push({ kind: 'attempt', mailTo, ...data }); },
};

const routeHandlers = () => {
    const handlers = {};
    const app = { post: (path, ...chain) => { handlers[path] = chain[chain.length - 1]; } };

    delete require.cache[require.resolve('../src/auth/register')];
    require('../src/auth/register')(app);

    const confirmEmailPath = '../src/auth/confirmEmail';
    try {
        delete require.cache[require.resolve(confirmEmailPath)];
        require(confirmEmailPath)(app);
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            throw e;
        }
    }

    return handlers;
};

const post = (path, body) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    routeHandlers()[path]({ body }, res);
});

const register = (body) => post('/api/profile/register', {
    login: 'newbie', password: 'secret123', email: 'newbie@e.ua', avatar: 1, ...body,
});

const withOwner = async (sequelize) => {
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('owner', 'x', 'owner@e.ua', 0, 0, 1)",
    );
};

test('with mail, a new and a taken address get the same answer and nobody is signed in', async () => {
    const sequelize = await fresh();
    await withOwner(sequelize);
    mailLog.length = 0;

    const newAddress = await register();
    const taken = await register({ login: 'someone', email: '  owner@e.ua ' });

    assert.strictEqual(newAddress.code, 202);
    assert.deepStrictEqual(taken, newAddress);
    assert.strictEqual(newAddress.payload.status, 'confirm-email');
    assert.ok(!('jwt' in newAddress.payload));
    assert.deepStrictEqual((await users(sequelize)).map((u) => u.login), ['owner']);
    assert.deepStrictEqual(mailLog.map((m) => [m.kind, m.mailTo]), [['confirm', 'newbie@e.ua'], ['attempt', 'owner@e.ua']]);
    assert.strictEqual(mailLog[1].login, 'owner');
});

test('with mail, the letter links to the confirm page with the pending token', async () => {
    const sequelize = await fresh();
    mailLog.length = 0;
    const saved = process.env.CLIENT_ORIGIN;
    process.env.CLIENT_ORIGIN = 'http://192.168.1.10:3009/';
    try {
        await register();
    } finally {
        require('./helpers/env').restoreEnv('CLIENT_ORIGIN', saved);
    }

    const [{ link, hours }] = mailLog;
    const match = /^http:\/\/192\.168\.1\.10:3009\/confirm-email\?token=([0-9a-f]{64})$/.exec(link);
    assert.ok(match, link);
    assert.strictEqual(hours, 24);
    const [row] = await pendingRows(sequelize);
    assert.strictEqual(row.tokenHash, sha256(match[1]));
    assert.ok(row.passwordHash.startsWith('$2'));
});

test('with mail, a taken login is refused at once', async () => {
    const sequelize = await fresh();
    await withOwner(sequelize);
    const MESSAGE = require('../src/constant/responseMessages');

    const result = await register({ login: 'OWNER', email: 'free@e.ua' });

    assert.strictEqual(result.code, 422);
    assert.strictEqual(result.payload.message, MESSAGE.AUTH.LOGIN_TAKEN);
    assert.deepStrictEqual(await pendingRows(sequelize), []);
});

test('with mail, an odd avatar cannot make a new address answer differently', async () => {
    const sequelize = await fresh();
    await withOwner(sequelize);

    for (const avatar of ['x', 1e12, -3, 2.5, null, { a: 1 }]) {
        const free = await register({ email: `free${String(Math.random()).slice(2)}@e.ua`, avatar });
        const taken = await register({ email: 'owner@e.ua', avatar });
        assert.deepStrictEqual(free, taken, JSON.stringify(avatar));
    }
    assert.ok((await pendingRows(sequelize)).every((row) => row.avatar === 1));
});

test('with mail, the attempt notice goes to the owner\'s stored address, never a lookalike or case variant typed by someone else', async () => {
    const sequelize = await fresh();
    await withOwner(sequelize);
    mailLog.length = 0;

    const result = await register({ login: 'someone', email: 'OWNER@E.UA' });

    assert.strictEqual(result.code, 202);
    assert.deepStrictEqual(mailLog.map((m) => [m.kind, m.mailTo, m.login]), [['attempt', 'owner@e.ua', 'owner']]);
    assert.deepStrictEqual(await pendingRows(sequelize), []);
});

test('with mail, a non-ASCII lookalike of an address is refused as invalid before anything is stored or mailed', async () => {
    const sequelize = await fresh();
    await withOwner(sequelize);
    const MESSAGE = require('../src/constant/responseMessages');
    mailLog.length = 0;

    for (const email of ['owner@é.ua', 'öwner@e.ua', 'ｏwner@e.ua']) {
        const result = await register({ login: `l${String(Math.random()).slice(2)}`, email });
        assert.strictEqual(result.code, 422, JSON.stringify(email));
        assert.strictEqual(result.payload.message, MESSAGE.AUTH.EMAIL_INVALID, JSON.stringify(email));
    }
    assert.deepStrictEqual(await pendingRows(sequelize), []);
    assert.deepStrictEqual(mailLog, []);
});

test('the confirmation and registration-attempt letters escape what the player typed', () => {
    const { emailConfirmationEmail, registrationAttemptEmail } = require('../src/modules/mailSender');
    const login = '<a href="https://evil.example">x</a>';

    const confirmation = emailConfirmationEmail({ login, link: 'http://host/confirm-email?token=abc&x="><script>', hours: 24 });
    assert.ok(!confirmation.html.includes('<a href="https://evil.example">'));
    assert.ok(confirmation.html.includes('&lt;a href=&quot;https://evil.example&quot;&gt;'));
    assert.ok(!confirmation.html.includes('"><script>'));
    assert.ok(confirmation.html.includes('token=abc&amp;x='));
    assert.ok(confirmation.html.includes('24'));

    const attempt = registrationAttemptEmail({ login });
    assert.ok(!attempt.html.includes('<a href="https://evil.example">'));
    assert.ok(attempt.html.includes('&lt;a href=&quot;https://evil.example&quot;&gt;'));
});
