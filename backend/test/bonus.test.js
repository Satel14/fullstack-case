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
