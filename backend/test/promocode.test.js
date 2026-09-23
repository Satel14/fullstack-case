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
