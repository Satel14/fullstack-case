const test = require('node:test');
const assert = require('node:assert');
const { recreateTestDatabase } = require('./helpers/db');
const { createMigrator } = require('../src/db/migrator');

const MIGRATION = '20261013000100-counters-not-null.js';
const PREVIOUS = '20261013000000-email-verifications.js';

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const respond = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler(req, res);
});

const stubItemCache = (caseDef) => {
    const itemHash = {};
    caseDef.ITEMS.forEach((item, i) => {
        itemHash[item.id] = JSON.stringify({
            name: `Item ${item.id}`,
            type: 'rifles',
            rare: item.rare,
            item_imagePath: `/img/${item.id}.png`,
            pricesInCredits: JSON.stringify({ default: 10 + i, painted: 20 + i }),
        });
    });
    const managerPath = require.resolve('../src/redis/manager');
    require.cache[managerPath] = {
        id: managerPath,
        filename: managerPath,
        loaded: true,
        exports: { getAllDataHashWithKey: async () => itemHash },
    };
};

const databaseBeforeTheMigration = async () => {
    const sequelize = await recreateTestDatabase();
    activeSequelize = sequelize;
    await createMigrator(sequelize, { quiet: true }).up({ to: PREVIOUS });
    return sequelize;
};

const migrateRest = (sequelize) => createMigrator(sequelize, { quiet: true }).up();

const READS_OPENS_OR_DROPS = /\b(?:FROM|JOIN)\s+`?(?:storage|case_opens)\b/i;

const migrateWatchingReadsOfOpensAndDrops = async (sequelize) => {
    const query = sequelize.query.bind(sequelize);
    const reads = [];
    sequelize.query = async (sql, options) => {
        if (typeof sql === 'string' && READS_OPENS_OR_DROPS.test(sql)) {
            const [plan] = await query(`EXPLAIN ${sql}`);
            reads.push({ sql, selectTypes: plan.map((step) => step.select_type) });
        }
        return query(sql, options);
    };
    try {
        await createMigrator(sequelize, { quiet: true }).up({ to: MIGRATION });
    } finally {
        delete sequelize.query;
    }
    return reads;
};

const open = (userId) => {
    const CaseController = require('../src/controllers/case');
    return respond(CaseController.openCaseById, {
        body: { id: 'dust2', count: 1 },
        user: { profile: { user_id: userId } },
    });
};

const columns = async (sequelize, table, fields) => {
    const [rows] = await sequelize.query(
        `SHOW COLUMNS FROM \`${table}\` WHERE Field IN (${fields.map(() => '?').join(', ')})`,
        { replacements: fields },
    );
    return Object.fromEntries(rows.map((c) => [c.Field, { nullable: c.Null, default: c.Default }]));
};

test('a case whose opened count was NULL counts its opens and closes at its limit after the migration', async () => {
    const sequelize = await databaseBeforeTheMigration();
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', 'x', 'p@e.ua', 10000, 0, 1)",
    );
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES "
        + "('dust2', 'DUST2', 100, 0, 1, 1, NULL, 'weapon', 2)",
    );
    await migrateRest(sequelize);
    stubItemCache(require('../src/constant/cases/_all').dust2);

    const results = [await open(1), await open(1), await open(1)];

    assert.deepStrictEqual(results.map((r) => r.code), [200, 200, 422], JSON.stringify(results.map((r) => r.payload.message)));
    const [[row]] = await sequelize.query("SELECT openedCount, published FROM cases WHERE id = 'dust2'");
    assert.deepStrictEqual({ openedCount: row.openedCount, published: row.published }, { openedCount: 2, published: 0 });
    const [[user]] = await sequelize.query('SELECT balance FROM users WHERE id = 1');
    assert.strictEqual(Number(user.balance), 9800);
});

test('a NULL opened count resumes at the opens already made, and a case they took to its limit closes', async () => {
    const sequelize = await databaseBeforeTheMigration();
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', 'x', 'p@e.ua', 10000, 0, 1)",
    );
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES "
        + "('dust2', 'DUST2', 100, 0, 1, 1, NULL, 'weapon', 5), "
        + "('mirage', 'MIRAGE', 100, 0, 1, 1, NULL, 'weapon', 4), "
        + "('nuke', 'NUKE', 100, 0, 1, 1, NULL, 'weapon', -1), "
        + "('kept', 'KEPT', 100, 0, 1, 1, 7, 'weapon', 1000)",
    );
    const opensRecorded = ['dust2', 'dust2', 'dust2', 'nuke', 'nuke', 'kept'];
    await sequelize.query(
        `INSERT INTO case_opens (userId, caseId) VALUES ${opensRecorded.map(() => '(1, ?)').join(', ')}`,
        { replacements: opensRecorded },
    );
    const dropsKept = ['dust2', 'mirage', 'mirage', 'mirage', 'mirage', 'nuke', 'kept'];
    await sequelize.query(
        `INSERT INTO storage (userId, itemId, color, caseId, status) VALUES ${dropsKept.map(() => "(1, 1, 'default', ?, 'received')").join(', ')}`,
        { replacements: dropsKept },
    );

    await migrateRest(sequelize);

    const [migrated] = await sequelize.query('SELECT id, openedCount, published FROM cases ORDER BY id');
    assert.deepStrictEqual(migrated.map((c) => [c.id, c.openedCount, c.published]), [
        ['dust2', 3, 1], ['kept', 7, 1], ['mirage', 4, 0], ['nuke', 2, 1],
    ]);

    stubItemCache(require('../src/constant/cases/_all').dust2);
    const results = [await open(1), await open(1), await open(1)];

    assert.deepStrictEqual(results.map((r) => r.code), [200, 200, 422], JSON.stringify(results.map((r) => r.payload.message)));
    const [[dust2]] = await sequelize.query("SELECT openedCount, published FROM cases WHERE id = 'dust2'");
    assert.deepStrictEqual({ openedCount: dust2.openedCount, published: dust2.published }, { openedCount: 5, published: 0 });
});

test('the opens already made are counted in one pass over the opens and the drops, not once per case', async () => {
    const sequelize = await databaseBeforeTheMigration();
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', 'x', 'p@e.ua', 10000, 0, 1)",
    );
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES "
        + "('dust2', 'DUST2', 100, 0, 1, 1, NULL, 'weapon', 5), "
        + "('mirage', 'MIRAGE', 100, 0, 1, 1, NULL, 'weapon', 1), "
        + "('nuke', 'NUKE', 100, 0, 1, 1, NULL, 'weapon', -1)",
    );
    await sequelize.query("INSERT INTO case_opens (userId, caseId) VALUES (1, 'dust2'), (1, 'dust2'), (1, 'nuke')");
    await sequelize.query(
        "INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (1, 1, 'default', 'mirage', 'received'), (1, 1, 'default', 'dust2', 'received')",
    );

    const reads = await migrateWatchingReadsOfOpensAndDrops(sequelize);

    assert.ok(reads.length > 0, 'the NULL counters are filled from the opens and the drops');
    assert.deepStrictEqual(reads.filter((read) => read.selectTypes.includes('DEPENDENT SUBQUERY')).map((read) => read.sql), []);
    const [migrated] = await sequelize.query('SELECT id, openedCount, published FROM cases ORDER BY id');
    assert.deepStrictEqual(migrated.map((c) => [c.id, c.openedCount, c.published]), [
        ['dust2', 2, 1], ['mirage', 1, 0], ['nuke', 1, 1],
    ]);
});

test('a database without NULL opened counts is migrated without reading the opens or the drops', async () => {
    const sequelize = await databaseBeforeTheMigration();
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', 'x', 'p@e.ua', 10000, 0, 1)",
    );
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES "
        + "('kept', 'KEPT', 100, 0, 1, 1, 7, 'weapon', 1000)",
    );
    await sequelize.query("INSERT INTO case_opens (userId, caseId) VALUES (1, 'kept')");
    await sequelize.query("INSERT INTO storage (userId, itemId, color, caseId, status) VALUES (1, 1, 'default', 'kept', 'received')");

    const reads = await migrateWatchingReadsOfOpensAndDrops(sequelize);

    assert.deepStrictEqual(reads.map((read) => read.sql), []);
    const [[kept]] = await sequelize.query("SELECT openedCount, published FROM cases WHERE id = 'kept'");
    assert.deepStrictEqual([kept.openedCount, kept.published], [7, 1]);
});

test('NULL counters on cases and players become 0 and the columns refuse NULL from then on', async () => {
    const sequelize = await databaseBeforeTheMigration();
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('nulls', 'x', 'n@e.ua', NULL, NULL, 1)",
    );
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES "
        + "('nulls', 'N', 100, 0, 1, 1, NULL, 'weapon', NULL), ('kept', 'K', 100, 0, 1, 1, 7, 'weapon', -1)",
    );

    await migrateRest(sequelize);

    const [cases] = await sequelize.query('SELECT id, openedCount, openLimit FROM cases ORDER BY id');
    assert.deepStrictEqual(cases.map((c) => [c.id, c.openedCount, c.openLimit]), [['kept', 7, -1], ['nulls', 0, 0]]);
    const [[user]] = await sequelize.query("SELECT balance, `rank` FROM users WHERE login = 'nulls'");
    assert.deepStrictEqual([Number(user.balance), Number(user.rank)], [0, 0]);
    assert.notStrictEqual(user.balance, null);
    assert.notStrictEqual(user.rank, null);

    assert.deepStrictEqual(await columns(sequelize, 'cases', ['openedCount', 'openLimit']), {
        openedCount: { nullable: 'NO', default: '0' },
        openLimit: { nullable: 'NO', default: '0' },
    });
    assert.deepStrictEqual(await columns(sequelize, 'users', ['balance', 'rank']), {
        balance: { nullable: 'NO', default: '0.00' },
        rank: { nullable: 'NO', default: '0.000000' },
    });

    await assert.rejects(() => sequelize.query("UPDATE cases SET openedCount = NULL WHERE id = 'kept'"));
    await assert.rejects(() => sequelize.query("UPDATE users SET balance = NULL WHERE login = 'nulls'"));
    await sequelize.query("INSERT INTO cases (id, title, price) VALUES ('bare', 'B', 10)");
    await sequelize.query("INSERT INTO users (login, email, role) VALUES ('bare', 'b@e.ua', 1)");
    const [[bareCase]] = await sequelize.query("SELECT openedCount, openLimit FROM cases WHERE id = 'bare'");
    assert.deepStrictEqual([bareCase.openedCount, bareCase.openLimit], [0, 0]);
    const [[bareUser]] = await sequelize.query("SELECT balance, `rank` FROM users WHERE login = 'bare'");
    assert.deepStrictEqual([Number(bareUser.balance), Number(bareUser.rank)], [0, 0]);
});

const tableShapes = async (sequelize) => {
    const shapes = {};
    for (const table of ['cases', 'users']) {
        const [[row]] = await sequelize.query(`SHOW CREATE TABLE \`${table}\``);
        shapes[table] = row['Create Table'].replace(/ AUTO_INCREMENT=\d+/, '');
    }
    return shapes;
};

test('reverting the migration restores the previous columns exactly and keeps every stored value', async () => {
    const sequelize = await databaseBeforeTheMigration();
    const previousShapes = await tableShapes(sequelize);
    await migrateRest(sequelize);
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('player', 'x', 'p@e.ua', 12.34, 0.000005, 1)",
    );
    await sequelize.query(
        "INSERT INTO cases (id, title, price, discount, categoryId, published, openedCount, type, openLimit) VALUES "
        + "('dust2', 'DUST2', 100, 0, 1, 1, 41, 'weapon', 1000)",
    );

    await createMigrator(sequelize, { quiet: true }).down({ to: MIGRATION });

    const [[row]] = await sequelize.query("SELECT openedCount, openLimit FROM cases WHERE id = 'dust2'");
    assert.deepStrictEqual([row.openedCount, row.openLimit], [41, 1000]);
    const [[user]] = await sequelize.query("SELECT balance, `rank` FROM users WHERE login = 'player'");
    assert.deepStrictEqual([Number(user.balance), Number(user.rank)], [12.34, 0.000005]);
    assert.deepStrictEqual(await tableShapes(sequelize), previousShapes);
});
