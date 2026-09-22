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
