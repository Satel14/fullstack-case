const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');
const { createMigrator } = require('../src/db/migrator');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const addUser = (sequelize) => sequelize.query(
    "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', 'x', 'player@e.ua', 0, 0, 1)",
);

const activeSeeds = async (sequelize, userId = 1) => {
    const [rows] = await sequelize.query(
        "SELECT id FROM provably_fair_seeds WHERE userId = ? AND status = 'active'",
        { replacements: [userId] },
    );
    return rows;
};

test('concurrent first requests for a seed all get the same one, and only one is created', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await addUser(sequelize);
    const PFService = require('../src/services/provablyFair');

    const seeds = await Promise.all(Array.from({ length: 12 }, () => PFService.ensureActiveSeed(1)));

    assert.strictEqual(new Set(seeds.map((s) => s.pf_id)).size, 1, 'every caller must see the same seed');
    assert.strictEqual((await activeSeeds(sequelize)).length, 1);
});

test('concurrent rotations leave exactly one active seed', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await addUser(sequelize);
    const PFService = require('../src/services/provablyFair');
    await PFService.ensureActiveSeed(1);

    const results = await Promise.allSettled(Array.from({ length: 4 }, () => PFService.rotateSeed(1)));

    assert.deepStrictEqual(results.filter((r) => r.status === 'rejected').map((r) => r.reason.message), []);
    assert.strictEqual((await activeSeeds(sequelize)).length, 1);
    const [revealed] = await sequelize.query("SELECT COUNT(*) AS n FROM provably_fair_seeds WHERE status = 'revealed'");
    assert.strictEqual(Number(revealed[0].n), 4);
});

test('the database refuses a second active seed for a user but allows any number of revealed ones', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const insert = (status) => sequelize.query(
        "INSERT INTO provably_fair_seeds (userId, serverSeed, serverSeedHash, clientSeed, nonce, status, created_at) "
        + "VALUES (1, 's', 'h', 'c', 0, ?, NOW())",
        { replacements: [status] },
    );

    await insert('active');
    await insert('revealed');
    await insert('revealed');
    await assert.rejects(() => insert('active'), (e) => /Duplicate entry/i.test(e.parent ? e.parent.message : e.message));
});

test('the migration keeps the newest duplicate active and reveals the older ones', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const migrator = createMigrator(sequelize, { quiet: true });
    await migrator.down({ to: '20260922000800-one-active-seed.js' });

    for (const userId of [1, 1, 1, 2]) {
        await sequelize.query(
            "INSERT INTO provably_fair_seeds (userId, serverSeed, serverSeedHash, clientSeed, nonce, status, created_at) "
            + "VALUES (?, 's', 'h', 'c', 0, 'active', NOW())",
            { replacements: [userId] },
        );
    }

    await migrator.up();

    const [rows] = await sequelize.query('SELECT id, userId, status, revealed_at FROM provably_fair_seeds ORDER BY id');
    assert.deepStrictEqual(rows.map((r) => [r.id, r.userId, r.status]), [
        [1, 1, 'revealed'], [2, 1, 'revealed'], [3, 1, 'active'], [4, 2, 'active'],
    ]);
    assert.ok(rows[0].revealed_at && rows[1].revealed_at);
});

test("locking one user's active seed does not block another user's", async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const PFService = require('../src/services/provablyFair');
    for (let userId = 1; userId <= 6; userId += 1) {
        await PFService.ensureActiveSeed(userId);
        await PFService.rotateSeed(userId);
    }

    const holder = await sequelize.transaction();
    try {
        await PFService.lockActiveSeed(1, holder);

        const started = Date.now();
        await sequelize.transaction(async (t) => {
            await sequelize.query('SET SESSION innodb_lock_wait_timeout = 3', { transaction: t });
            await PFService.lockActiveSeed(5, t);
        });
        assert.ok(Date.now() - started < 2000, `user 5 waited ${Date.now() - started}ms on user 1's lock`);
    } finally {
        await holder.commit();
    }
});

const gapLocksHeldBy = async (sequelize, transaction) => {
    const [[trx]] = await sequelize.query(
        'SELECT trx_id FROM information_schema.innodb_trx WHERE trx_mysql_thread_id = CONNECTION_ID()',
        { transaction },
    );
    const [locks] = await sequelize.query(
        "SELECT LOCK_MODE, LOCK_DATA FROM performance_schema.data_locks "
        + "WHERE OBJECT_NAME = 'provably_fair_seeds' AND LOCK_TYPE = 'RECORD' AND ENGINE_TRANSACTION_ID = ?",
        { replacements: [trx.trx_id], transaction },
    );
    return locks.filter((l) => !/,REC_NOT_GAP$/.test(l.LOCK_MODE));
};

test('locking the seed of a player who has none takes no gap lock, so two first opens cannot deadlock', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const PFService = require('../src/services/provablyFair');
    for (let userId = 1; userId <= 3; userId += 1) {
        await PFService.ensureActiveSeed(userId);
    }

    const prepared = await PFService.ensureActiveSeed(41);
    const t = await sequelize.transaction();
    try {
        const seed = await PFService.lockActiveSeed(41, t, prepared.pf_id);
        assert.strictEqual(seed.pf_userId, 41);
        assert.strictEqual(seed.pf_status, 'active');
        assert.deepStrictEqual(await gapLocksHeldBy(sequelize, t), []);
    } finally {
        await t.rollback();
    }

    const firstOpen = async (userId) => {
        const preparedSeed = await PFService.ensureActiveSeed(userId);
        return sequelize.transaction(async (tx) => {
            const seed = await PFService.lockActiveSeed(userId, tx, preparedSeed.pf_id);
            await new Promise((resolve) => setTimeout(resolve, 200));
            return seed.pf_userId;
        });
    };
    const results = await Promise.allSettled([firstOpen(42), firstOpen(43)]);
    assert.deepStrictEqual(results.map((r) => (r.status === 'fulfilled' ? r.value : r.reason.message)), [42, 43]);
});

test('a client seed is stored without surrounding whitespace', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const PFService = require('../src/services/provablyFair');

    const saved = await PFService.setClientSeed(1, '  lucky seed \t');

    assert.strictEqual(saved.clientSeed, 'lucky seed');
    const [[row]] = await sequelize.query("SELECT clientSeed FROM provably_fair_seeds WHERE userId = 1 AND status = 'active'");
    assert.strictEqual(row.clientSeed, 'lucky seed');
});

const withinSeconds = (promise, seconds, what) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} did not finish within ${seconds}s`)), seconds * 1000)),
]);

test('more concurrent rotations and opens than the pool has connections still complete', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const PFService = require('../src/services/provablyFair');
    const poolMax = sequelize.connectionManager.pool.maxSize;
    const callers = poolMax + 2;

    const rotations = Array.from({ length: callers }, (_, i) => PFService.rotateSeed(100 + i));
    const rotated = await withinSeconds(Promise.allSettled(rotations), 10, `${callers} concurrent rotations`);
    assert.deepStrictEqual(rotated.filter((r) => r.status === 'rejected').map((r) => r.reason.message), []);

    const openLike = async (userId) => {
        const prepared = await PFService.ensureActiveSeed(userId);
        return sequelize.transaction((t) => PFService.lockActiveSeed(userId, t, prepared.pf_id));
    };
    const opened = await withinSeconds(
        Promise.allSettled(Array.from({ length: callers }, (_, i) => openLike(200 + i))),
        10,
        `${callers} concurrent seed locks`,
    );
    assert.deepStrictEqual(opened.filter((r) => r.status === 'rejected').map((r) => r.reason.message), []);
});
