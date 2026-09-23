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

const transfer = (from, to, amount) => new Promise((resolve) => {
    const UserController = require('../src/controllers/user');
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    UserController.sendMoneyForUserByUserId({
        body: { userIdTo: to, money_count: amount },
        user: { profile: { user_id: from } },
    }, res);
});

test('two players sending each other money at the same moment both succeed', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES "
        + "('alice', 'x', 'alice@e.ua', 1000, 0, 1), ('bob', 'x', 'bob@e.ua', 1000, 0, 1)",
    );

    for (let round = 0; round < 15; round += 1) {
        const results = await Promise.all([transfer(1, 2, 10), transfer(2, 1, 10)]);
        assert.deepStrictEqual(
            results.map((r) => r.code),
            [200, 200],
            `round ${round}: ${JSON.stringify(results.map((r) => r.payload.message))}`,
        );
    }

    const [rows] = await sequelize.query('SELECT login, balance FROM users ORDER BY id');
    assert.deepStrictEqual(rows.map((r) => [r.login, Number(r.balance)]), [['alice', 1000], ['bob', 1000]]);
});
