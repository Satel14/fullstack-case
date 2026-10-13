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
    assert.deepStrictEqual(await Service.confirm(token), { outcome: 'email-taken' });
    assert.deepStrictEqual(await Service.confirm(older), { outcome: 'email-taken' });
    assert.strictEqual((await users(sequelize)).length, 1);
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

const deadlockError = () => {
    const e = new Error('Deadlock found when trying to get lock; try restarting transaction');
    e.original = { code: 'ER_LOCK_DEADLOCK' };
    return e;
};

test('a confirmation that deadlocks once is retried and still creates the account', async () => {
    const sequelize = await fresh();
    const Service = require('../src/services/emailVerification');
    const EmailVerification = require('../src/models/emailVerification');
    const token = await Service.createPending(pending());
    const real = EmailVerification.findAll;
    let calls = 0;
    EmailVerification.findAll = function findAll(...args) {
        calls += 1;
        if (calls === 1) {
            return Promise.reject(deadlockError());
        }
        return real.apply(this, args);
    };

    let result;
    try {
        result = await Service.confirm(token);
    } finally {
        EmailVerification.findAll = real;
    }

    assert.strictEqual(result.outcome, 'created');
    assert.ok(calls > 1, 'the deadlocked attempt must be retried');
    assert.strictEqual((await users(sequelize)).length, 1);
});

test('a confirmation that deadlocks on every attempt is rejected, not guessed as email-taken', async () => {
    const sequelize = await fresh();
    const Service = require('../src/services/emailVerification');
    const EmailVerification = require('../src/models/emailVerification');
    const token = await Service.createPending(pending());
    const real = EmailVerification.findAll;
    let calls = 0;
    EmailVerification.findAll = () => {
        calls += 1;
        return Promise.reject(deadlockError());
    };

    try {
        await assert.rejects(
            () => Service.confirm(token),
            (e) => e.original && e.original.code === 'ER_LOCK_DEADLOCK',
        );
    } finally {
        EmailVerification.findAll = real;
    }

    assert.strictEqual(calls, 3);
    assert.strictEqual((await users(sequelize)).length, 0);
});

test('two links of one address confirmed at once create one account and send the other to sign in', async () => {
    const sequelize = await fresh();
    const Service = require('../src/services/emailVerification');
    const db = require('../src/config/db');
    const realQuery = db.query.bind(db);
    let deadlocks = 0;
    db.query = (...args) => realQuery(...args).catch((e) => {
        if (e && e.original && e.original.code === 'ER_LOCK_DEADLOCK') {
            deadlocks += 1;
        }
        throw e;
    });

    try {
        for (let round = 0; round < 10; round += 1) {
            const email = `round${round}@e.ua`;
            const login = (n) => (round % 2 ? `r${round}` : `r${round}x${n}`);
            const first = await Service.createPending(pending({ login: login(1), email }));
            const second = await Service.createPending(pending({ login: login(2), email }));

            const settled = await Promise.allSettled([Service.confirm(first), Service.confirm(second)]);

            const failures = settled.filter((s) => s.status === 'rejected').map((s) => s.reason && s.reason.message);
            assert.deepStrictEqual(failures, [], `round ${round}`);
            const outcomes = settled.map((s) => s.value.outcome).sort();
            assert.deepStrictEqual(outcomes, ['created', 'email-taken'], `round ${round}`);
        }
    } finally {
        db.query = realQuery;
    }

    const created = await users(sequelize);
    assert.strictEqual(created.length, 10);
    assert.strictEqual(new Set(created.map((u) => u.email)).size, 10);
    assert.ok((await pendingRows(sequelize)).every((row) => row.usedAt !== null));
    assert.strictEqual(deadlocks, 0, 'the confirmations must not deadlock at all');
});

test('a used link of an address that has an account sends the player to sign in, otherwise it is invalid', async () => {
    const sequelize = await fresh();
    const Service = require('../src/services/emailVerification');
    const token = await Service.createPending(pending());
    const orphan = await Service.createPending(pending({ login: 'gone', email: 'gone@e.ua' }));
    await Service.confirm(token);
    await Service.confirm(orphan);
    await sequelize.query("DELETE FROM users WHERE login = 'gone'");

    assert.deepStrictEqual(await Service.confirm(token), { outcome: 'email-taken' });
    assert.deepStrictEqual(await Service.confirm(orphan), { outcome: 'invalid' });
});

test('registering leaves stale pending rows alone; the sweep deletes only what has expired, used or not', async () => {
    const sequelize = await fresh();
    const Service = require('../src/services/emailVerification');
    const now = new Date('2026-10-13T10:00:00Z');
    const second = new Date(now.getTime() + 1000);
    const third = new Date(now.getTime() + 2000);
    const sweepAt = new Date(now.getTime() + Service.TOKEN_TTL_MS);
    await Service.createPending(pending({ login: 'expired' }), now);
    const used = await Service.createPending(pending({ login: 'used', email: 'used@e.ua' }), second);
    await Service.confirm(used, second);
    await Service.createPending(pending({ login: 'live', email: 'live@e.ua' }), third);
    await Service.createPending(pending({ login: 'later', email: 'later@e.ua' }), new Date(sweepAt.getTime() + 1));

    assert.deepStrictEqual((await pendingRows(sequelize)).map((row) => row.login), ['expired', 'used', 'live', 'later']);

    assert.strictEqual(await Service.sweepStale(sweepAt), 1, 'only the expired row is gone; the used link has not expired yet');
    assert.deepStrictEqual((await pendingRows(sequelize)).map((row) => row.login), ['used', 'live', 'later']);
    assert.strictEqual(await Service.sweepStale(sweepAt), 0, 'a second sweep at the same time deletes nothing more');

    const usedExpiry = new Date(sweepAt.getTime() + 1500);
    assert.strictEqual(await Service.sweepStale(usedExpiry), 1, 'the used link is swept once it expires too');
    assert.deepStrictEqual((await pendingRows(sequelize)).map((row) => row.login), ['live', 'later']);
});

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

test('the stale sweep repeats, never overlaps, and stops when asked', async () => {
    const Service = require('../src/services/emailVerification');
    let running = 0;
    let mostAtOnce = 0;
    let runs = 0;
    const slowSweep = async () => {
        running += 1;
        runs += 1;
        mostAtOnce = Math.max(mostAtOnce, running);
        await sleep(40);
        running -= 1;
        return 0;
    };

    const sweep = Service.startSweep({ intervalMs: 5, run: slowSweep });
    await sleep(300);
    sweep.stop();
    await sleep(60);
    const afterStop = runs;
    await sleep(100);

    assert.ok(afterStop >= 3, `only ${afterStop} sweeps ran`);
    assert.strictEqual(mostAtOnce, 1);
    assert.strictEqual(runs, afterStop, 'a stopped sweep must not run again');
});

test('a failed stale sweep is logged and the next one still runs', async () => {
    const Service = require('../src/services/emailVerification');
    let runs = 0;
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => { errors.push(args.join(' ')); };
    try {
        const sweep = Service.startSweep({
            intervalMs: 5,
            run: async () => { runs += 1; throw new Error('database gone'); },
        });
        await sleep(100);
        sweep.stop();
    } finally {
        console.error = originalError;
    }

    assert.ok(runs >= 2, `only ${runs} sweeps ran`);
    assert.ok(errors.some((line) => line.includes('database gone')));
});

test('the server starts the stale sweep once, after migrations are verified and it is listening', () => {
    const fs = require('fs');
    const path = require('path');
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const start = "require('./src/services/emailVerification').startSweep()";
    const gateOpens = server.indexOf('assertMigrationsApplied(sequelize).then(');
    const gateCloses = server.indexOf('}).catch(', gateOpens);
    const listenAt = server.indexOf('app.listen(', gateOpens);
    const sweepAt = server.indexOf(start);
    assert.ok(sweepAt > listenAt && listenAt > gateOpens && sweepAt < gateCloses, 'the sweep must start inside the gate, after listen');
    assert.strictEqual(server.split(start).length - 1, 1, 'the sweep must be started exactly once');
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

    delete require.cache[require.resolve('../src/auth/confirmEmail')];
    require('../src/auth/confirmEmail')(app);

    return handlers;
};

const post = async (path, body, trace = []) => {
    const answers = [];
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) {
            trace.push('answer');
            answers.push({ code: this.statusCode, payload });
            return this;
        },
    };
    await routeHandlers()[path]({ body }, res);
    assert.strictEqual(answers.length, 1, `answered ${answers.length} times: ${JSON.stringify(answers)}`);
    return answers[0];
};

const register = (body, trace) => post('/api/profile/register', {
    login: 'newbie', password: 'secret123', email: 'newbie@e.ua', avatar: 1, ...body,
}, trace);

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

test('with mail, the answer goes out before the password is hashed or the address is looked up', async () => {
    const sequelize = await fresh();
    await withOwner(sequelize);
    const Encrypt = require('../src/modules/Encrypt');
    const Users = require('../src/models/user');
    const Service = require('../src/services/emailVerification');
    const real = { hash: Encrypt.cryptPassword, find: Users.findOne, create: Service.createPending };
    const trace = [];
    Encrypt.cryptPassword = (...args) => { trace.push('hash'); return real.hash(...args); };
    Users.findOne = function findOne(...args) { trace.push('lookup'); return real.find.apply(this, args); };
    Service.createPending = (...args) => { trace.push('store'); return real.create(...args); };
    try {
        await register({ email: 'free@e.ua' }, trace);
        const newAddress = trace.splice(0);
        await register({ login: 'someone', email: 'owner@e.ua' }, trace);

        assert.deepStrictEqual(newAddress, ['answer', 'hash', 'lookup', 'store']);
        assert.deepStrictEqual(trace, ['answer', 'hash', 'lookup']);
    } finally {
        Encrypt.cryptPassword = real.hash;
        Users.findOne = real.find;
        Service.createPending = real.create;
    }
});

test('with mail, a failure after the answer is logged and never changes the answer', async () => {
    const sequelize = await fresh();
    await withOwner(sequelize);
    const MESSAGE = require('../src/constant/responseMessages');
    const Service = require('../src/services/emailVerification');
    const mailSender = require('../src/modules/mailSender');
    const real = { create: Service.createPending, notice: mailSender.registrationAttemptNotice, error: console.error };
    const errors = [];
    Service.createPending = async () => { throw new Error('pending store is down'); };
    mailSender.registrationAttemptNotice = () => { throw new Error('mail queue is down'); };
    console.error = (...args) => { errors.push(args.join(' ')); };
    let results;
    try {
        results = [await register({ email: 'free@e.ua' }), await register({ login: 'someone', email: 'owner@e.ua' })];
    } finally {
        Service.createPending = real.create;
        mailSender.registrationAttemptNotice = real.notice;
        console.error = real.error;
    }

    const expected = { code: 202, payload: { status: 'confirm-email', message: MESSAGE.AUTH.CONFIRM_EMAIL_SENT } };
    assert.deepStrictEqual(results, [expected, expected]);
    assert.ok(errors.some((line) => line.includes('pending store is down')), JSON.stringify(errors));
    assert.ok(errors.some((line) => line.includes('mail queue is down')), JSON.stringify(errors));
    assert.deepStrictEqual(await pendingRows(sequelize), []);
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

const confirmToken = async () => {
    mailLog.length = 0;
    await register();
    return /token=([0-9a-f]{64})/.exec(mailLog.find((m) => m.kind === 'confirm').link)[1];
};

test('confirming the emailed link creates the account, signs in and welcomes the player', async () => {
    const sequelize = await fresh();
    const token = await confirmToken();
    const { sessionUser } = require('../src/auth/token');
    const jwt = require('jsonwebtoken');

    const result = await post('/api/profile/confirm-email', { token });

    assert.strictEqual(result.code, 200, JSON.stringify(result.payload));
    assert.strictEqual(result.payload.user.user_login, 'newbie');
    assert.strictEqual(result.payload.user.user_email, 'newbie@e.ua');
    assert.ok(!('user_tokenVersion' in result.payload.user));
    const payload = jwt.decode(result.payload.jwt);
    assert.ok(await sessionUser(payload.id, payload.ver));
    assert.deepStrictEqual((await users(sequelize)).map((u) => u.login), ['newbie']);
    assert.deepStrictEqual(mailLog.filter((m) => m.kind === 'welcome').map((m) => m.mailTo), ['newbie@e.ua']);
});

test('a used, unknown or taken confirmation is refused with the reason', async () => {
    const sequelize = await fresh();
    const MESSAGE = require('../src/constant/responseMessages');
    const token = await confirmToken();
    await post('/api/profile/confirm-email', { token });

    const again = await post('/api/profile/confirm-email', { token });
    const unknown = await post('/api/profile/confirm-email', { token: 'f'.repeat(64) });
    const missing = await post('/api/profile/confirm-email', {});

    assert.strictEqual(again.code, 422);
    assert.strictEqual(again.payload.message, MESSAGE.AUTH.CONFIRM_EMAIL_TAKEN);
    for (const refused of [unknown, missing]) {
        assert.strictEqual(refused.code, 422);
        assert.strictEqual(refused.payload.message, MESSAGE.AUTH.CONFIRM_LINK_INVALID);
    }

    mailLog.length = 0;
    await register({ login: 'second', email: 'second@e.ua' });
    const secondToken = /token=([0-9a-f]{64})/.exec(mailLog.find((m) => m.kind === 'confirm').link)[1];
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('Second', 'x', 'z@e.ua', 0, 0, 1)",
    );
    const loginTaken = await post('/api/profile/confirm-email', { token: secondToken });
    assert.strictEqual(loginTaken.code, 422);
    assert.strictEqual(loginTaken.payload.message, MESSAGE.AUTH.CONFIRM_LOGIN_TAKEN);
});

test('a confirmation that throws is answered with a fixed message, not the raw error', async () => {
    await fresh();
    const MESSAGE = require('../src/constant/responseMessages');
    const Service = require('../src/services/emailVerification');
    const real = Service.confirm;
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => { errors.push(args.join(' ')); };
    Service.confirm = async () => { throw new Error('ER_LOCK_DEADLOCK: raw mysql text that must not reach the player'); };

    let result;
    try {
        result = await post('/api/profile/confirm-email', { token: 'f'.repeat(64) });
    } finally {
        Service.confirm = real;
        console.error = originalError;
    }

    assert.strictEqual(result.code, 500);
    assert.strictEqual(result.payload.message, MESSAGE.AUTH.CONFIRM_FAILED);
    assert.ok(!JSON.stringify(result.payload).includes('ER_LOCK_DEADLOCK'));
    assert.ok(errors.some((line) => line.includes('ER_LOCK_DEADLOCK')), JSON.stringify(errors));
});

test('the confirm route is rate limited like the other sign-in routes', () => {
    const express = require('express');
    const limiters = require('../src/middleware/rateLimiters');
    const app = express();
    require('../routes')(app);
    const layer = app._router.stack.find((l) => l.route && l.route.path === '/api/profile/confirm-email');
    assert.ok(layer, 'POST /api/profile/confirm-email is mounted');
    assert.ok(layer.route.methods.post);
    assert.ok(layer.route.stack.some((s) => s.handle === limiters.authLimiter));
});
