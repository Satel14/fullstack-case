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

const seedPlayer = async (sequelize, receiveInfo = null) => {
    await sequelize.query(
        'INSERT INTO users (login, password, email, balance, `rank`, role, receiveInfo) VALUES '
        + "('player', 'x', 'p@e.ua', 0, 0, 1, ?)",
        { replacements: [receiveInfo] },
    );
};

test('the catalogue holds the agreed bonuses and amounts', () => {
    const { BONUSES, findBonus } = require('../src/constant/bonuses');
    assert.deepStrictEqual(BONUSES.map((b) => [b.id, b.kind, b.amount]), [
        ['daily', 'daily', 50],
        ['welcome', 'once', 100],
        ['receive-info', 'once', 50],
        ['first-case', 'once', 100],
        ['first-withdrawal', 'once', 200],
    ]);
    assert.strictEqual(findBonus('nope'), undefined);
});

test('the daily claim key follows the Kyiv calendar day, not UTC', () => {
    const { claimKey } = require('../src/services/bonus');
    const { findBonus } = require('../src/constant/bonuses');
    const daily = findBonus('daily');
    assert.strictEqual(claimKey(daily, new Date('2026-07-15T20:59:00Z')), 'daily:2026-07-15');
    assert.strictEqual(claimKey(daily, new Date('2026-07-15T21:01:00Z')), 'daily:2026-07-16');
    assert.strictEqual(claimKey(daily, new Date('2026-01-15T21:59:00Z')), 'daily:2026-01-15');
    assert.strictEqual(claimKey(daily, new Date('2026-01-15T22:01:00Z')), 'daily:2026-01-16');
    assert.strictEqual(claimKey(findBonus('welcome'), new Date()), 'welcome');
});

test('step bonuses become available only once their condition holds', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayer(sequelize);
    const BonusService = require('../src/services/bonus');
    const available = async () => Object.fromEntries((await BonusService.stateFor(1)).map((b) => [b.id, b.available]));

    assert.deepStrictEqual(await available(), {
        daily: true, welcome: true, 'receive-info': false, 'first-case': false, 'first-withdrawal': false,
    });

    await sequelize.query("UPDATE users SET receiveInfo = 'steam:abc' WHERE id = 1");
    await sequelize.query("INSERT INTO case_opens (userId, caseId) VALUES (1, 'dust2')");
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (1, 707, 'default', 'dust2', 'waitingtrade')",
    );
    const afterPending = await available();
    assert.strictEqual(afterPending['receive-info'], true);
    assert.strictEqual(afterPending['first-case'], true);
    assert.strictEqual(afterPending['first-withdrawal'], false, 'a pending withdrawal must not count');

    await sequelize.query("UPDATE storage SET status = 'received' WHERE id = 1");
    assert.strictEqual((await available())['first-withdrawal'], true);
});

test('blank receive info does not satisfy the receive-info bonus', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayer(sequelize, '   ');
    const BonusService = require('../src/services/bonus');
    const state = await BonusService.stateFor(1);
    assert.strictEqual(state.find((b) => b.id === 'receive-info').available, false);
});

const MESSAGE = require('../src/constant/responseMessages');

const respond = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler(req, res);
});

const claim = (bonusId, userId = 1) => {
    const Controller = require('../src/controllers/bonusHistory');
    return respond(Controller.activateBonus, { body: { bonusId }, user: { profile: { user_id: userId } } });
};

const ledger = async (sequelize) => {
    const [[user]] = await sequelize.query('SELECT balance FROM users WHERE id = 1');
    const [history] = await sequelize.query("SELECT balanceChange FROM balance_history WHERE userId = 1 AND type = 'bonus'");
    const [claims] = await sequelize.query('SELECT bonusId FROM bonus_history WHERE userId = 1 ORDER BY id');
    return {
        balance: Number(user.balance),
        credits: history.map((r) => Number(r.balanceChange)),
        claims: claims.map((r) => r.bonusId),
    };
};

test('the welcome bonus is credited once, logged, and refused the second time', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayer(sequelize);

    const first = await claim('welcome');
    assert.strictEqual(first.code, 200, JSON.stringify(first.payload));
    assert.strictEqual(Number(first.payload.balance), 100);
    assert.strictEqual(first.payload.bonus, 100);

    const second = await claim('welcome');
    assert.strictEqual(second.code, 422);
    assert.strictEqual(second.payload.message, MESSAGE.BONUS.ALREADY_USED);
    assert.deepStrictEqual(await ledger(sequelize), { balance: 100, credits: [100], claims: ['welcome'] });
});

test('parallel claims of one bonus credit it exactly once', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayer(sequelize);

    const results = await Promise.all(Array.from({ length: 6 }, () => claim('welcome')));

    assert.deepStrictEqual(results.map((r) => r.code).sort(), [200, 422, 422, 422, 422, 422]);
    assert.deepStrictEqual(await ledger(sequelize), { balance: 100, credits: [100], claims: ['welcome'] });
});

test('a bonus whose condition does not hold is refused and credits nothing', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayer(sequelize);
    assert.ok(MESSAGE.BONUS.NOT_AVAILABLE);

    const result = await claim('first-case');

    assert.strictEqual(result.code, 422);
    assert.strictEqual(result.payload.message, MESSAGE.BONUS.NOT_AVAILABLE);
    assert.deepStrictEqual(await ledger(sequelize), { balance: 0, credits: [], claims: [] });
});

test('an unknown bonus is refused', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayer(sequelize);

    const result = await claim('jackpot');

    assert.strictEqual(result.code, 422);
    assert.strictEqual(result.payload.message, MESSAGE.BONUS.NOT_EXIST);
});

test('the daily bonus can be claimed once per Kyiv day', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayer(sequelize);
    const BonusService = require('../src/services/bonus');

    assert.strictEqual((await claim('daily')).code, 200);
    assert.strictEqual((await claim('daily')).code, 422);

    await sequelize.query("UPDATE bonus_history SET bonusId = 'daily:2000-01-01' WHERE userId = 1");
    assert.strictEqual((await claim('daily')).code, 200, 'yesterday\'s claim must not block today');

    const state = await BonusService.stateFor(1);
    assert.deepStrictEqual(state.find((b) => b.id === 'daily'), {
        id: 'daily', kind: 'daily', amount: 50, claimed: true, available: false,
    });
});

test('the bonus list reports what the player has claimed and can claim', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayer(sequelize);
    await claim('welcome');
    const Controller = require('../src/controllers/bonusHistory');

    const listed = await respond(Controller.getBonusListOfUser, { user: { profile: { user_id: 1 } } });

    assert.strictEqual(listed.code, 200);
    assert.deepStrictEqual(listed.payload.data.find((b) => b.id === 'welcome'), {
        id: 'welcome', kind: 'once', amount: 100, claimed: true, available: false,
    });
});

test('a claim locks the player before writing the claim row', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayer(sequelize);

    const holder = await sequelize.transaction();
    let pending;
    try {
        await sequelize.query('SELECT id FROM users WHERE id = 1 FOR UPDATE', { transaction: holder });
        pending = claim('welcome');
        let waiting = [];
        for (let attempt = 0; attempt < 50 && waiting.length === 0; attempt += 1) {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => { setTimeout(resolve, 50); });
            // eslint-disable-next-line no-await-in-loop
            [waiting] = await sequelize.query(
                "SELECT trx_id FROM information_schema.innodb_trx WHERE trx_state = 'LOCK WAIT' "
                + 'AND trx_mysql_thread_id IN (SELECT id FROM information_schema.processlist WHERE db = DATABASE())',
                { transaction: holder },
            );
        }
        assert.strictEqual(waiting.length, 1, 'the claim never waited for the player row');
        const [claimLocks] = await sequelize.query(
            "SELECT LOCK_MODE FROM performance_schema.data_locks WHERE OBJECT_SCHEMA = DATABASE() "
            + "AND OBJECT_NAME = 'bonus_history' AND ENGINE_TRANSACTION_ID = ?",
            { replacements: [waiting[0].trx_id], transaction: holder },
        );
        assert.deepStrictEqual(claimLocks, [], 'the claim wrote its row before locking the player');
    } finally {
        await holder.commit();
        await pending;
    }
    assert.strictEqual((await pending).code, 200);
});

const withinMs = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) => { setTimeout(() => reject(new Error(`still running after ${ms} ms`)), ms); }),
]);

test('parallel claims of a bonus with a condition credit it once, quickly, without holding a second connection', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayer(sequelize);
    await sequelize.query("INSERT INTO case_opens (userId, caseId) VALUES (1, 'dust2')");

    const results = await withinMs(Promise.all(Array.from({ length: 6 }, () => claim('first-case'))), 8000);

    assert.deepStrictEqual(results.map((r) => r.code).sort(), [200, 422, 422, 422, 422, 422]);
    assert.deepStrictEqual(await ledger(sequelize), { balance: 100, credits: [100], claims: ['first-case'] });
});

test('the receive-info and first-withdrawal bonuses are paid once their condition holds', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayer(sequelize, 'steam:abc');
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (1, 707, 'default', 'dust2', 'received')",
    );

    assert.strictEqual((await claim('receive-info')).code, 200);
    assert.strictEqual((await claim('first-withdrawal')).code, 200);
    assert.deepStrictEqual(await ledger(sequelize), {
        balance: 250, credits: [50, 200], claims: ['receive-info', 'first-withdrawal'],
    });
});

test('a bonus id that is not a string is refused by the route validator', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await seedPlayer(sequelize);
    const Controller = require('../src/controllers/bonusHistory');

    for (const bonusId of [['welcome'], { id: 'welcome' }, 100, null]) {
        const req = { body: { bonusId }, user: { profile: { user_id: 1 } } };
        // eslint-disable-next-line no-await-in-loop
        for (const check of Controller.validate('activateBonus')) await check.run(req);
        // eslint-disable-next-line no-await-in-loop
        const result = await respond(Controller.activateBonus, req);
        assert.strictEqual(result.code, 422, `bonusId ${JSON.stringify(bonusId)}`);
    }
    assert.deepStrictEqual(await ledger(sequelize), { balance: 0, credits: [], claims: [] });
});
