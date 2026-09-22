const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const OLD_PASSWORD = 'secret123';

const routes = () => {
    const handlers = {};
    const app = { post: (path, ...chain) => { handlers[path] = chain[chain.length - 1]; } };
    require('../src/auth/forgotPassword')(app);
    return handlers;
};

const call = (handler, body) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler({ body }, res);
});

const withMail = async (fn) => {
    const mailSender = require('../src/modules/mailSender');
    const original = mailSender.passwordResetLink;
    const savedKey = process.env.RESEND_API_KEY;
    const sent = [];
    process.env.RESEND_API_KEY = 'test-key';
    mailSender.passwordResetLink = (to, data) => { sent.push({ to, ...data }); };
    try {
        return await fn(sent);
    } finally {
        mailSender.passwordResetLink = original;
        process.env.RESEND_API_KEY = savedKey;
    }
};

const setup = async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const hash = await bcrypt.hash(OLD_PASSWORD, 10);
    const [id] = await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', ?, 'player@e.ua', 0, 0, 1)",
        { replacements: [hash] },
    );
    return { sequelize, userId: id, hash };
};

const tokenFromLink = (link) => new URL(link).searchParams.get('token');

const storedPassword = async (sequelize) => {
    const [rows] = await sequelize.query("SELECT password FROM users WHERE login = 'player'");
    return rows[0].password;
};

test('a reset request mails a link, stores only the token hash and leaves the password alone', async () => {
    const { sequelize, hash } = await setup();
    const MESSAGE = require('../src/constant/responseMessages');

    await withMail(async (sent) => {
        const result = await call(routes()['/api/profile/forgotpassword'], { email: 'player@e.ua' });

        assert.strictEqual(result.code, 200);
        assert.strictEqual(result.payload.message, MESSAGE.AUTH.RESET_LINK_SENT);
        assert.strictEqual(sent.length, 1);
        assert.strictEqual(sent[0].to, 'player@e.ua');

        const token = tokenFromLink(sent[0].link);
        assert.match(token, /^[0-9a-f]{64}$/);
        assert.match(sent[0].link, /\/reset-password\?token=/);

        const [rows] = await sequelize.query('SELECT tokenHash, usedAt, expiresAt FROM password_resets');
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].tokenHash, crypto.createHash('sha256').update(token).digest('hex'));
        assert.notStrictEqual(rows[0].tokenHash, token);
        assert.strictEqual(rows[0].usedAt, null);
        assert.ok(new Date(rows[0].expiresAt) > new Date());
    });

    assert.strictEqual(await storedPassword(sequelize), hash);
});

test('an unknown email gets the same answer and nothing is issued', async () => {
    const { sequelize } = await setup();

    await withMail(async (sent) => {
        const known = await call(routes()['/api/profile/forgotpassword'], { email: 'player@e.ua' });
        const unknown = await call(routes()['/api/profile/forgotpassword'], { email: 'nobody@e.ua' });

        assert.deepStrictEqual(unknown, known);
        assert.strictEqual(sent.length, 1);
    });

    const [rows] = await sequelize.query('SELECT COUNT(*) AS n FROM password_resets');
    assert.strictEqual(Number(rows[0].n), 1);
});

test('a token sets the new password once and invalidates the other outstanding links', async () => {
    const { sequelize } = await setup();
    const MESSAGE = require('../src/constant/responseMessages');

    await withMail(async (sent) => {
        await call(routes()['/api/profile/forgotpassword'], { email: 'player@e.ua' });
        await call(routes()['/api/profile/forgotpassword'], { email: 'player@e.ua' });
        const [first, second] = sent.map((m) => tokenFromLink(m.link));

        const reset = await call(routes()['/api/profile/reset-password'], { token: first, password: 'brand-new-1' });
        assert.strictEqual(reset.code, 200);
        assert.strictEqual(reset.payload.message, MESSAGE.AUTH.PASSWORD_CHANGED);
        assert.ok(await bcrypt.compare('brand-new-1', await storedPassword(sequelize)));

        const reused = await call(routes()['/api/profile/reset-password'], { token: first, password: 'another-2' });
        assert.strictEqual(reused.code, 400);
        assert.strictEqual(reused.payload.message, MESSAGE.AUTH.RESET_LINK_INVALID);

        const sibling = await call(routes()['/api/profile/reset-password'], { token: second, password: 'another-2' });
        assert.strictEqual(sibling.code, 400, 'a second link issued before the reset must stop working');
    });

    assert.ok(await bcrypt.compare('brand-new-1', await storedPassword(sequelize)));
});

test('an expired or unknown token is refused and the password stays', async () => {
    const { sequelize, userId, hash } = await setup();
    const MESSAGE = require('../src/constant/responseMessages');
    const token = crypto.randomBytes(32).toString('hex');
    await require('../src/models/passwordReset').create({
        reset_userId: userId,
        reset_tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        reset_expiresAt: new Date(Date.now() - 60 * 1000),
        created_at: new Date(Date.now() - 31 * 60 * 1000),
    });

    const expired = await call(routes()['/api/profile/reset-password'], { token, password: 'brand-new-1' });
    assert.strictEqual(expired.code, 400);
    assert.strictEqual(expired.payload.message, MESSAGE.AUTH.RESET_LINK_INVALID);

    const unknown = await call(routes()['/api/profile/reset-password'], {
        token: crypto.randomBytes(32).toString('hex'),
        password: 'brand-new-1',
    });
    assert.strictEqual(unknown.code, 400);

    assert.strictEqual(await storedPassword(sequelize), hash);
});

test('a malformed token or an out-of-range password is refused before the token is spent', async () => {
    const { sequelize, hash } = await setup();
    const MESSAGE = require('../src/constant/responseMessages');

    await withMail(async (sent) => {
        await call(routes()['/api/profile/forgotpassword'], { email: 'player@e.ua' });
        const token = tokenFromLink(sent[0].link);
        const reset = routes()['/api/profile/reset-password'];

        for (const password of ['', '12345', 'x'.repeat(73), undefined, 123456]) {
            const result = await call(reset, { token, password });
            assert.strictEqual(result.code, 422, `password ${JSON.stringify(password)}`);
            assert.strictEqual(result.payload.message, MESSAGE.AUTH.PASSWORD_INVALID);
        }
        for (const bad of ['', 'short', undefined, 'g'.repeat(64)]) {
            const result = await call(reset, { token: bad, password: 'brand-new-1' });
            assert.strictEqual(result.code, 400, `token ${JSON.stringify(bad)}`);
        }

        const valid = await call(reset, { token, password: 'brand-new-1' });
        assert.strictEqual(valid.code, 200, 'the refused attempts must not have used up the token');
    });

    assert.notStrictEqual(await storedPassword(sequelize), hash);
});
