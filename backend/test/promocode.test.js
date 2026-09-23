const test = require('node:test');
const assert = require('node:assert');
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

const redeem = (userId, promocode) => new Promise((resolve) => {
    const PromocodeController = require('../src/controllers/promocode');
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    PromocodeController.usePromocode({
        body: { promocode },
        user: { profile: { user_id: userId } },
    }, res);
});

const redeemThroughRoute = async (userId, body) => {
    const PromocodeController = require('../src/controllers/promocode');
    const req = { body, user: { profile: { user_id: userId } } };
    for (const chain of PromocodeController.validate('usePromocode')) {
        await chain.run(req);
    }
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(payload) { resolve({ code: this.statusCode, payload }); },
        };
        PromocodeController.usePromocode(req, res);
    });
};

const seedPlayers = (sequelize) => sequelize.query(
    'INSERT INTO users (login, password, email, balance, `rank`, role) VALUES '
    + "('alice', 'x', 'alice@e.ua', 100, 0, 1), ('bob', 'x', 'bob@e.ua', 100, 0, 1)",
);

const addPromocode = (sequelize, code, bonus, limit) => sequelize.query(
    'INSERT INTO promocodes (code, description, bonus, used_ids, `limit`) VALUES (?, ?, ?, ?, ?)',
    { replacements: [code, 'gift', bonus, '[]', limit] },
);

const balances = async (sequelize) => {
    const [rows] = await sequelize.query('SELECT login, balance FROM users ORDER BY id');
    return rows.map((r) => [r.login, r.balance === null ? null : Number(r.balance)]);
};

test("a player whose row is busy does not hold up everyone else's redemption of the same code", async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayers(sequelize);
    await addPromocode(sequelize, 'SPRING', '50', 10);
    const UserService = require('../src/services/user');

    const open = await sequelize.transaction();
    let alice;
    let bob;
    try {
        await UserService.getBalanceByUserId(1, { transaction: open, lock: open.LOCK.UPDATE });
        alice = redeem(1, 'SPRING');
        await new Promise((resolve) => setTimeout(resolve, 300));

        bob = redeem(2, 'SPRING');
        const outcome = await Promise.race([
            bob.then(() => 'redeemed'),
            new Promise((resolve) => setTimeout(() => resolve('blocked'), 1500)),
        ]);
        assert.strictEqual(outcome, 'redeemed', "bob queued behind alice's redemption");
    } finally {
        await open.commit();
    }

    assert.ok((await alice).payload.balance);
    assert.ok((await bob).payload.balance);
    assert.deepStrictEqual(await balances(sequelize), [['alice', 150], ['bob', 150]]);
});

const MESSAGE = require('../src/constant/responseMessages');

const promocodeState = async (sequelize, code) => {
    const [[row]] = await sequelize.query('SELECT used_ids FROM promocodes WHERE code = ?', { replacements: [code] });
    const [[history]] = await sequelize.query("SELECT COUNT(*) AS n FROM balance_history WHERE type = 'promocode'");
    const usedIds = typeof row.used_ids === 'string' ? JSON.parse(row.used_ids) : row.used_ids;
    return { usedIds, credits: Number(history.n) };
};

for (const [label, bonus] of [
    ['no bonus', null], ['an empty bonus', ''], ['a zero bonus', '0'],
    ['a negative bonus', '-50'], ['a bonus that is not a number', 'fifty'],
]) {
    test(`a promocode with ${label} is refused without touching the balance`, async () => {
        const sequelize = await resetTestDatabase();
        activeSequelize = sequelize;
        await seedPlayers(sequelize);
        await addPromocode(sequelize, 'BROKEN', bonus, 10);

        const result = await redeem(1, 'BROKEN');

        assert.strictEqual(result.payload.message, MESSAGE.PROMOCODE.INVALID);
        assert.strictEqual(result.payload.balance, undefined);
        assert.deepStrictEqual(await balances(sequelize), [['alice', 100], ['bob', 100]]);
        assert.deepStrictEqual(await promocodeState(sequelize, 'BROKEN'), { usedIds: [], credits: 0 });
    });
}

test('a promocode without a limit is refused as invalid rather than as exhausted', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayers(sequelize);
    await addPromocode(sequelize, 'NOLIMIT', '50', null);

    const result = await redeem(1, 'NOLIMIT');

    assert.strictEqual(result.payload.message, MESSAGE.PROMOCODE.INVALID);
    assert.deepStrictEqual(await balances(sequelize), [['alice', 100], ['bob', 100]]);
    assert.deepStrictEqual(await promocodeState(sequelize, 'NOLIMIT'), { usedIds: [], credits: 0 });
});

test('a promocode credits exactly its bonus, kopiyky included', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayers(sequelize);
    await addPromocode(sequelize, 'CENTS', '12.50', 10);

    const result = await redeem(1, 'CENTS');

    assert.strictEqual(Number(result.payload.balance), 112.5);
    assert.match(result.payload.message, /12\.50? ₴/);
    assert.deepStrictEqual(await balances(sequelize), [['alice', 112.5], ['bob', 100]]);
    assert.deepStrictEqual(await promocodeState(sequelize, 'CENTS'), { usedIds: [1], credits: 1 });
});

test('a code pasted with spaces or a tab around it is still found', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayers(sequelize);
    await addPromocode(sequelize, 'SPRING', '50', 10);

    const alice = await redeemThroughRoute(1, { promocode: ' SPRING ' });
    const bob = await redeemThroughRoute(2, { promocode: '\tSPRING' });

    assert.strictEqual(Number(alice.payload.balance), 150, JSON.stringify(alice.payload));
    assert.strictEqual(Number(bob.payload.balance), 150, JSON.stringify(bob.payload));
    assert.deepStrictEqual(await promocodeState(sequelize, 'SPRING'), { usedIds: [1, 2], credits: 2 });
});

test('a blank or missing code is rejected by validation', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayers(sequelize);
    await sequelize.query("INSERT INTO promocodes (code, description, bonus, used_ids, `limit`) VALUES ('', 'blank', '50', '[]', 10)");

    for (const body of [{ promocode: '   ' }, { promocode: '' }, {}]) {
        const result = await redeemThroughRoute(1, body);
        assert.strictEqual(result.code, 422, JSON.stringify(body));
        assert.strictEqual(result.payload.message, MESSAGE.VALIDATOR.ERROR);
    }
    assert.deepStrictEqual(await balances(sequelize), [['alice', 100], ['bob', 100]]);
});
