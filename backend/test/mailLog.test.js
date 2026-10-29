const test = require('node:test');
const assert = require('node:assert');
const { Resend } = require('resend');

const ENV = ['RESEND_API_KEY', 'RESEND_FROM'];
const savedEnv = Object.fromEntries(ENV.map((name) => [name, process.env[name]]));
process.env.RESEND_API_KEY = 're_test_key';
process.env.RESEND_FROM = 'CASES.UA <mail@cases.example>';

const mailSender = require('../src/modules/mailSender');

const emails = Object.getPrototypeOf(new Resend('re_probe').emails);
const originalSend = emails.send;

test.after(() => {
    emails.send = originalSend;
    ENV.forEach((name) => {
        if (savedEnv[name] === undefined) {
            delete process.env[name];
        } else {
            process.env[name] = savedEnv[name];
        }
    });
});

const withLogsCaught = async (fn) => {
    const lines = [];
    const originals = ['log', 'info', 'warn', 'error'].map((level) => [level, console[level]]);
    originals.forEach(([level]) => { console[level] = (...args) => { lines.push(args.map(String).join(' ')); }; });
    try {
        await fn();
        await new Promise((resolve) => { setTimeout(resolve, 20); });
        return lines;
    } finally {
        originals.forEach(([level, original]) => { console[level] = original; });
    }
};

test('a mail Resend accepts leaves nothing in the log, and one it refuses is logged once as failed', async () => {
    const answers = [
        { data: { id: 'sent-1' }, error: null, headers: {} },
        { data: null, error: { name: 'validation_error', statusCode: 403, message: 'the sending domain is not verified' }, headers: {} },
    ];
    emails.send = async () => answers.shift();

    const lines = await withLogsCaught(() => {
        mailSender.userRegistered('player@e.ua', { login: 'player' });
        mailSender.passwordResetLink('player@e.ua', { login: 'player', link: 'http://host/reset-password#token=abc', minutes: 30 });
    });

    assert.strictEqual(lines.length, 1);
    assert.match(lines[0], /the sending domain is not verified/);
    assert.doesNotMatch(lines[0], /token=abc|player@e\.ua/);
});

test('with mail off nothing is sent and nothing is logged per mail', async () => {
    const sent = [];
    emails.send = async (message) => { sent.push(message); return { data: { id: 'x' }, error: null }; };
    process.env.RESEND_API_KEY = '';

    const lines = await withLogsCaught(() => {
        mailSender.userRegistered('player@e.ua', { login: 'player' });
    });

    process.env.RESEND_API_KEY = 're_test_key';
    assert.deepStrictEqual(sent, []);
    assert.deepStrictEqual(lines, []);
});
