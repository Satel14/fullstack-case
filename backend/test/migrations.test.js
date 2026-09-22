const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

test('migrations create every expected table', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const [rows] = await sequelize.query('SHOW TABLES');
    const tables = rows.map((r) => String(Object.values(r)[0]).toLowerCase()).sort();

    assert.deepStrictEqual(tables, [
        'articles',
        'balance_history',
        'bonus_history',
        'case_opens',
        'cases',
        'categories',
        'insider_prices',
        'items',
        'modules',
        'promocodes',
        'provably_fair_seeds',
        'sequelizemeta',
        'storage',
        'users',
    ]);
});

test('baseline snapshots the schema including its current defects', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const migrator = require('../src/db/migrator').createMigrator(sequelize, { quiet: true });
    await migrator.down({ to: 0 });
    await migrator.up({ to: '20260922000000-baseline.js' });

    const [users] = await sequelize.query("SHOW COLUMNS FROM users WHERE Field IN ('balance', 'rank', 'email', 'login')");
    const byField = Object.fromEntries(users.map((c) => [c.Field, c]));

    assert.match(byField.balance.Type, /decimal\(10,0\)/i);
    assert.match(byField.rank.Type, /decimal\(10,0\)/i);
    assert.match(byField.email.Type, /text/i);
    assert.strictEqual(byField.email.Key, '');
    assert.strictEqual(byField.login.Key, '');

    const [history] = await sequelize.query("SHOW COLUMNS FROM balance_history WHERE Field = 'balanceChange'");
    assert.match(history[0].Type, /int/i);
});

test('money columns end up with full precision', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    const [users] = await sequelize.query("SHOW COLUMNS FROM users WHERE Field IN ('balance', 'rank')");
    const byField = Object.fromEntries(users.map((c) => [c.Field, c]));
    assert.match(byField.balance.Type, /decimal\(12,2\)/i);
    assert.match(byField.rank.Type, /decimal\(16,6\)/i);

    const [history] = await sequelize.query("SHOW COLUMNS FROM balance_history WHERE Field = 'balanceChange'");
    assert.match(history[0].Type, /decimal\(12,2\)/i);
});

test('fractional currency survives a round trip', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query("INSERT INTO users (login, email, balance, `rank`, role) VALUES ('kopiyka', 'k@e.ua', 12.50, 0.123456, 1)");
    const [rows] = await sequelize.query("SELECT balance, `rank` FROM users WHERE login = 'kopiyka'");

    assert.strictEqual(Number(rows[0].balance), 12.5);
    assert.strictEqual(Number(rows[0].rank), 0.123456);
});

test('login and email are unique after migration', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    const [email] = await sequelize.query("SHOW COLUMNS FROM users WHERE Field = 'email'");
    assert.match(email[0].Type, /varchar\(255\)/i);

    const isDuplicateEntry = (e) => e.name === 'SequelizeUniqueConstraintError'
        && /Duplicate entry/i.test(e.parent?.message ?? '');

    await sequelize.query("INSERT INTO users (login, email, role) VALUES ('dup', 'dup@e.ua', 1)");
    await assert.rejects(
        () => sequelize.query("INSERT INTO users (login, email, role) VALUES ('dup', 'other@e.ua', 1)"),
        isDuplicateEntry,
    );
    await assert.rejects(
        () => sequelize.query("INSERT INTO users (login, email, role) VALUES ('other', 'dup@e.ua', 1)"),
        isDuplicateEntry,
    );
});

test('uniqueness migration refuses to run when duplicates exist', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { createMigrator } = require('../src/db/migrator');
    const migrator = createMigrator(sequelize, { quiet: true });

    await migrator.down();
    await migrator.down();
    await sequelize.query("INSERT INTO users (login, email, role) VALUES ('same', 'a@e.ua', 1)");
    await sequelize.query("INSERT INTO users (login, email, role) VALUES ('same', 'b@e.ua', 1)");

    await assert.rejects(() => migrator.up(), /duplicate login/i);
});

test('uniqueness migration tolerates several NULL emails', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { createMigrator } = require('../src/db/migrator');
    const migrator = createMigrator(sequelize, { quiet: true });

    await migrator.down();
    await migrator.down();
    await sequelize.query("INSERT INTO users (login, email, role) VALUES ('a', NULL, 1)");
    await sequelize.query("INSERT INTO users (login, email, role) VALUES ('b', NULL, 1)");
    await sequelize.query("INSERT INTO users (login, email, role) VALUES ('c', NULL, 1)");

    await assert.doesNotReject(() => migrator.up());
});

const bonusHistoryIndexes = async (sequelize) => {
    const [rows] = await sequelize.query('SHOW INDEX FROM bonus_history');
    return rows.reduce((acc, r) => {
        acc[r.Key_name] = acc[r.Key_name] || { unique: r.Non_unique === 0, columns: [] };
        acc[r.Key_name].columns[r.Seq_in_index - 1] = r.Column_name;
        return acc;
    }, {});
};

const bonusHistoryIdExtra = async (sequelize) => {
    const [rows] = await sequelize.query("SHOW COLUMNS FROM bonus_history WHERE Field = 'id'");
    return rows[0].Extra || '';
};

test('bonus_history ends up unique on (userId, bonusId) with an auto-increment id', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    const indexes = await bonusHistoryIndexes(sequelize);
    assert.deepStrictEqual(indexes.bonus_history_user_id_bonus_id, {
        unique: true,
        columns: ['userId', 'bonusId'],
    });
    assert.strictEqual(indexes.bonus_history_user_id, undefined);
    assert.match(await bonusHistoryIdExtra(sequelize), /auto_increment/i);
});

test('a bonus claim inserts without an explicit id and a duplicate claim is rejected', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    await sequelize.query("INSERT INTO bonus_history (userId, bonusId) VALUES (1, 'daily')");
    await assert.rejects(
        () => sequelize.query("INSERT INTO bonus_history (userId, bonusId) VALUES (1, 'daily')"),
        (e) => e.name === 'SequelizeUniqueConstraintError',
    );
    await assert.doesNotReject(
        () => sequelize.query("INSERT INTO bonus_history (userId, bonusId) VALUES (2, 'daily')"),
    );

    const [rows] = await sequelize.query('SELECT id FROM bonus_history ORDER BY id');
    const ids = rows.map((r) => r.id);
    assert.strictEqual(ids.length, 2);
    assert.ok(ids.every((id) => Number.isInteger(id) && id > 0), `ids were ${JSON.stringify(ids)}`);
    assert.ok(ids[0] < ids[1]);
});

test('bonus-history parity converges from a chain-built database with the legacy index', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const parity = require('../migrations/20260922000300-bonus-history-parity');
    const context = sequelize.getQueryInterface();

    await parity.down({ context });
    let indexes = await bonusHistoryIndexes(sequelize);
    assert.ok(indexes.bonus_history_user_id, 'legacy index should exist after down()');
    assert.strictEqual(indexes.bonus_history_user_id_bonus_id, undefined);
    assert.doesNotMatch(await bonusHistoryIdExtra(sequelize), /auto_increment/i);

    await parity.up({ context });
    indexes = await bonusHistoryIndexes(sequelize);
    assert.deepStrictEqual(indexes.bonus_history_user_id_bonus_id, {
        unique: true,
        columns: ['userId', 'bonusId'],
    });
    assert.strictEqual(indexes.bonus_history_user_id, undefined);
    assert.match(await bonusHistoryIdExtra(sequelize), /auto_increment/i);
});

test('bonus-history parity is idempotent on an already-correct database', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const parity = require('../migrations/20260922000300-bonus-history-parity');
    const context = sequelize.getQueryInterface();

    await assert.doesNotReject(() => parity.up({ context }));
    await assert.doesNotReject(() => parity.up({ context }));

    const indexes = await bonusHistoryIndexes(sequelize);
    assert.deepStrictEqual(indexes.bonus_history_user_id_bonus_id, {
        unique: true,
        columns: ['userId', 'bonusId'],
    });
    assert.match(await bonusHistoryIdExtra(sequelize), /auto_increment/i);
});

test('bonus-history parity converges from a live-shaped database missing only auto-increment', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const parity = require('../migrations/20260922000300-bonus-history-parity');
    const context = sequelize.getQueryInterface();

    await sequelize.query('ALTER TABLE bonus_history MODIFY `id` INT NOT NULL');
    assert.doesNotMatch(await bonusHistoryIdExtra(sequelize), /auto_increment/i);

    await parity.up({ context });

    const indexes = await bonusHistoryIndexes(sequelize);
    assert.deepStrictEqual(indexes.bonus_history_user_id_bonus_id, {
        unique: true,
        columns: ['userId', 'bonusId'],
    });
    assert.strictEqual(indexes.bonus_history_user_id, undefined);
    assert.match(await bonusHistoryIdExtra(sequelize), /auto_increment/i);
});
