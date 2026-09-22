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
    let handler;
    const app = { post: (path, limiter, fn) => { handler = fn; } };
    require('../src/auth/forgotPassword')(app);
    return handler;
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
