const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcrypt');
const { resetTestDatabase } = require('./helpers/db');
const { restoreEnv } = require('./helpers/env');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const forgotPasswordHandler = () => {
    const handlers = {};
    const app = { post: (path, ...chain) => { handlers[path] = chain[chain.length - 1]; } };
    require('../src/auth/forgotPassword')(app);
    return handlers['/api/profile/forgotpassword'];
};

const call = async (handler, body) => {
    const answers = [];
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { answers.push({ code: this.statusCode, payload }); return this; },
    };
    await handler({ body }, res);
    assert.strictEqual(answers.length, 1, `answered ${answers.length} times: ${JSON.stringify(answers)}`);
    return answers[0];
};

test('without a mail provider the password is left alone and the reset is reported unavailable', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const hash = await bcrypt.hash('secret123', 10);
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', ?, 'player@e.ua', 0, 0, 1)",
        { replacements: [hash] },
    );

    const savedKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = '';
    try {
        const MESSAGE = require('../src/constant/responseMessages');
        const result = await call(forgotPasswordHandler(), { email: 'player@e.ua' });

        assert.strictEqual(result.code, 503);
        assert.strictEqual(result.payload.message, MESSAGE.AUTH.PASSWORD_RESET_UNAVAILABLE);
    } finally {
        restoreEnv('RESEND_API_KEY', savedKey);
    }

    const [rows] = await sequelize.query("SELECT password FROM users WHERE login = 'player'");
    assert.strictEqual(rows[0].password, hash, 'the password must not change when no email can carry the new one');
});

test('a site address ending in a slash still gives a reset link the site can open', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', 'x', 'player@e.ua', 0, 0, 1)",
    );

    const mailSender = require('../src/modules/mailSender');
    const routePath = require.resolve('../src/auth/forgotPassword');
    const saved = { origin: process.env.CLIENT_ORIGIN, isEnabled: mailSender.isEnabled, send: mailSender.passwordResetLink };
    const links = [];
    process.env.CLIENT_ORIGIN = 'http://192.168.1.10:3009/';
    mailSender.isEnabled = () => true;
    mailSender.passwordResetLink = (to, data) => { links.push(data.link); };
    delete require.cache[routePath];
    try {
        const result = await call(forgotPasswordHandler(), { email: 'player@e.ua' });

        assert.strictEqual(result.code, 200);
        assert.strictEqual(links.length, 1);
        assert.match(links[0], /^http:\/\/192\.168\.1\.10:3009\/reset-password#token=[^/]+$/);
    } finally {
        restoreEnv('CLIENT_ORIGIN', saved.origin);
        mailSender.isEnabled = saved.isEnabled;
        mailSender.passwordResetLink = saved.send;
        delete require.cache[routePath];
    }
});

test('the mail sender loads and reports itself disabled without an API key', () => {
    const savedKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = '';
    try {
        const mailSender = require('../src/modules/mailSender');
        assert.strictEqual(mailSender.isEnabled(), false);
        assert.doesNotThrow(() => mailSender.userRegistered('player@e.ua', { login: 'player' }));
    } finally {
        restoreEnv('RESEND_API_KEY', savedKey);
    }
});

const warningsWhenLoaded = (env) => {
    const mailPath = require.resolve('../src/modules/mailSender');
    const cached = require.cache[mailPath];
    const saved = Object.fromEntries(Object.keys(env).map((name) => [name, process.env[name]]));
    const originalWarn = console.warn;
    const warnings = [];
    Object.entries(env).forEach(([name, value]) => restoreEnv(name, value));
    console.warn = (...args) => { warnings.push(args.join(' ')); };
    delete require.cache[mailPath];
    try {
        require('../src/modules/mailSender');
    } finally {
        console.warn = originalWarn;
        Object.entries(saved).forEach(([name, value]) => restoreEnv(name, value));
        if (cached) {
            require.cache[mailPath] = cached;
        } else {
            delete require.cache[mailPath];
        }
    }
    return warnings;
};

test('a sender on Resend\'s testing domain is warned about once at load, since only the account owner gets its mail', () => {
    const aboutTestingDomain = (warnings) => warnings.filter((line) => line.includes('resend.dev'));

    for (const from of [undefined, 'caseUA <onboarding@resend.dev>', 'onboarding@Resend.Dev']) {
        const warnings = aboutTestingDomain(warningsWhenLoaded({ RESEND_API_KEY: 'test-key', RESEND_FROM: from }));
        assert.strictEqual(warnings.length, 1, `RESEND_FROM ${JSON.stringify(from)}: ${JSON.stringify(warnings)}`);
        assert.match(warnings[0], /owner/);
        assert.match(warnings[0], /RESEND_FROM/);
    }

    for (const from of ['caseUA <noreply@case.example>', 'noreply@notresend.dev']) {
        const warnings = warningsWhenLoaded({ RESEND_API_KEY: 'test-key', RESEND_FROM: from });
        assert.deepStrictEqual(warnings, [], `RESEND_FROM ${JSON.stringify(from)}`);
    }
    assert.deepStrictEqual(aboutTestingDomain(warningsWhenLoaded({ RESEND_API_KEY: '', RESEND_FROM: undefined })), []);
});

test('user-controlled values are escaped in the email HTML', () => {
    const { passwordResetEmail, welcomeEmail } = require('../src/modules/mailSender');
    const login = '<a href="https://evil.example">claim your prize</a>';

    const reset = passwordResetEmail({
        login,
        link: 'http://localhost:3000/reset-password?token=abc&x="><script>',
        minutes: 30,
    });
    assert.ok(!reset.html.includes('<a href="https://evil.example">'), reset.html);
    assert.ok(reset.html.includes('&lt;a href=&quot;https://evil.example&quot;&gt;'));
    assert.ok(!reset.html.includes('"><script>'));
    assert.ok(reset.html.includes('token=abc&amp;x='));

    assert.ok(!welcomeEmail({ login }).html.includes('<a href="https://evil.example">'));
});
