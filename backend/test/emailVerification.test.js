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
