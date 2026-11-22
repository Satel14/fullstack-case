const { recreateTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createMigrator } = require('../src/db/migrator');

const MIGRATION = '20261122000100-case-categories.js';
const PREVIOUS = '20261118000200-admin-stats-indexes.js';

let activeSequelize;

test.after(async () => {
    if (activeSequelize) await activeSequelize.close();
});

const databaseBeforeMigration = async () => {
    activeSequelize = await recreateTestDatabase();
    await createMigrator(activeSequelize, { quiet: true }).up({ to: PREVIOUS });
    return activeSequelize;
};

const categories = async (sequelize) => {
    const [rows] = await sequelize.query('SELECT * FROM categories ORDER BY id');
    return rows;
};

test('category slugs are nullable and unique, and only category 1 receives collection metadata', async () => {
    const sequelize = await databaseBeforeMigration();
    await sequelize.query(
        "INSERT INTO categories (id, title, priority, published, titleHelp) VALUES (1, 'CS:GO Weapon Cases', 100, 0, 'Kept help'), (2, 'Custom operation', 43, 1, 'Other help'), (3, 'Custom souvenir', 21, 0, NULL)",
    );
    await sequelize.query(
        "INSERT INTO cases (id, title, price, categoryId, published, openedCount, openLimit) VALUES ('bomj', 'Kept case', 500, 1, 0, 42, 77)",
    );
    const before = await categories(sequelize);
    const [casesBefore] = await sequelize.query('SELECT * FROM cases');

    await createMigrator(sequelize, { quiet: true }).up({ to: MIGRATION });

    const [columns] = await sequelize.query("SHOW COLUMNS FROM categories WHERE Field = 'slug'");
    assert.equal(columns.length, 1);
    assert.match(columns[0].Type, /^varchar\(32\)$/i);
    assert.equal(columns[0].Null, 'YES');
    const [indexes] = await sequelize.query("SHOW INDEX FROM categories WHERE Key_name = 'categories_slug_unique'");
    assert.equal(indexes.length, 1);
    assert.equal(indexes[0].Column_name, 'slug');
    assert.equal(indexes[0].Non_unique, 0);
    assert.deepEqual(await categories(sequelize), before.map((row) => ({
        ...row,
        ...(row.id === 1 ? { title: 'CS2 Collections', priority: 60, slug: 'collections' } : { slug: null }),
    })));
    const [casesAfter] = await sequelize.query('SELECT * FROM cases');
    assert.deepEqual(casesAfter, casesBefore);
    await assert.rejects(
        sequelize.query("INSERT INTO categories (id, title, slug) VALUES (9, 'Duplicate', 'collections')"),
        (error) => error.name === 'SequelizeUniqueConstraintError',
    );
    await assert.doesNotReject(
        sequelize.query("INSERT INTO categories (id, title, slug) VALUES (9, 'Null one', NULL), (10, 'Null two', NULL)"),
    );
});

test('reverting category slugs restores category 1 title and priority and keeps every category row', async () => {
    const sequelize = await databaseBeforeMigration();
    await sequelize.query(
        "INSERT INTO categories (id, title, priority, published, titleHelp) VALUES (1, 'CS:GO Weapon Cases', 100, 0, 'Kept help'), (4, 'Custom weapons', 123, 1, 'Other help')",
    );
    const migrator = createMigrator(sequelize, { quiet: true });
    await migrator.up({ to: MIGRATION });
    await sequelize.query("UPDATE categories SET slug = 'custom-weapons' WHERE id = 4");
    const before = await categories(sequelize);

    await migrator.down({ to: MIGRATION });

    const [columns] = await sequelize.query("SHOW COLUMNS FROM categories WHERE Field = 'slug'");
    const [indexes] = await sequelize.query("SHOW INDEX FROM categories WHERE Key_name = 'categories_slug_unique'");
    assert.deepEqual(columns, []);
    assert.deepEqual(indexes, []);
    assert.deepEqual(await categories(sequelize), before.map(({ slug, ...row }) => ({
        ...row,
        ...(row.id === 1 ? { title: 'CS:GO Weapon Cases', priority: 100 } : {}),
    })));
});

test('the category migration does not insert categories into an empty database', async () => {
    const sequelize = await databaseBeforeMigration();
    await createMigrator(sequelize, { quiet: true }).up({ to: MIGRATION });
    assert.deepEqual(await categories(sequelize), []);
});
