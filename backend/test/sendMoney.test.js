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

const transferChecked = async (from, body) => {
    const UserController = require('../src/controllers/user');
    const req = { body, user: { profile: { user_id: from } } };
    await Promise.all(UserController.validate('sendMoneyForUserByUserId').map((rule) => rule.run(req)));
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(payload) { resolve({ code: this.statusCode, payload }); },
        };
        UserController.sendMoneyForUserByUserId(req, res);
    });
};

const withErrorsCaught = async (fn) => {
    const logged = [];
    const originalError = console.error;
    console.error = (...args) => { logged.push(args.map(String).join(' ')); };
    try {
        return { result: await fn(), logged };
    } finally {
        console.error = originalError;
    }
};

test('a transfer names its recipient by a plain id: a padded, decimal or huge one is refused before anything is written', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES "
        + "('alice', 'x', 'alice@e.ua', 1000, 0, 1), ('bob', 'x', 'bob@e.ua', 1000, 0, 1)",
    );
    const MESSAGE = require('../src/constant/responseMessages');
    const crafted = [`${'0'.repeat(238)}2`, `2.${'0'.repeat(300)}`, '2.0', '02', '2147483648', '9'.repeat(400)];

    const { result: answers, logged } = await withErrorsCaught(() => Promise.all(
        crafted.map((userIdTo) => transferChecked(1, { userIdTo, money_count: 1 })),
    ));

    assert.deepStrictEqual(answers.map(({ code, payload }) => [code, payload.message]), crafted.map(() => [422, MESSAGE.VALIDATOR.ERROR]));
    assert.deepStrictEqual(logged, []);
    const [rows] = await sequelize.query('SELECT login, balance FROM users ORDER BY id');
    assert.deepStrictEqual(rows.map((r) => [r.login, Number(r.balance)]), [['alice', 1000], ['bob', 1000]]);
    const [[{ count }]] = await sequelize.query('SELECT COUNT(*) AS count FROM balance_history');
    assert.strictEqual(Number(count), 0);
});

test('a transfer records the recipient by their own id, however the id was written', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES "
        + "('alice', 'x', 'alice@e.ua', 1000, 0, 1), ('bob', 'x', 'bob@e.ua', 1000, 0, 1)",
    );

    const answer = await transferChecked(1, { userIdTo: '+2', money_count: 10 });

    assert.strictEqual(answer.code, 200, JSON.stringify(answer.payload));
    const [history] = await sequelize.query('SELECT userId, balanceChange, extraData FROM balance_history ORDER BY id');
    assert.deepStrictEqual(
        history.map((row) => [row.userId, Number(row.balanceChange), row.extraData]),
        [[1, -10, 'Sended to userid 2'], [2, 10, 'Sended from userid 1']],
    );
});
