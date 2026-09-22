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

const forgotPasswordHandler = () => {
    const handlers = {};
    const app = { post: (path, ...chain) => { handlers[path] = chain[chain.length - 1]; } };
    require('../src/auth/forgotPassword')(app);
    return handlers['/api/profile/forgotpassword'];
};

const call = (handler, body) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler({ body }, res);
});

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
        process.env.RESEND_API_KEY = savedKey;
    }

    const [rows] = await sequelize.query("SELECT password FROM users WHERE login = 'player'");
    assert.strictEqual(rows[0].password, hash, 'the password must not change when no email can carry the new one');
});

test('the mail sender loads and reports itself disabled without an API key', () => {
    const savedKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = '';
    try {
        const mailSender = require('../src/modules/mailSender');
        assert.strictEqual(mailSender.isEnabled(), false);
        assert.doesNotThrow(() => mailSender.userRegistered('player@e.ua', { login: 'player' }));
    } finally {
        process.env.RESEND_API_KEY = savedKey;
    }
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
