const test = require('node:test');
const assert = require('node:assert');
const { recreateTestDatabase } = require('./helpers/db');
const { createMigrator } = require('../src/db/migrator');

const MIGRATION = '20261029000000-item-grade.js';
const PREVIOUS = '20261028000100-site-articles.js';

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const databaseAt = async (migration) => {
    const sequelize = await recreateTestDatabase();
    activeSequelize = sequelize;
    await createMigrator(sequelize, { quiet: true }).up({ to: migration });
    return sequelize;
};

const gradeColumn = async (sequelize) => {
    const [rows] = await sequelize.query("SHOW COLUMNS FROM items WHERE Field = 'grade'");
    return rows[0] || null;
};

test('the migration gives every item a nullable grade', async () => {
    const sequelize = await databaseAt(PREVIOUS);
    await sequelize.query("INSERT INTO items (itemId, name, rare, colors, type, imagePath) VALUES (1, 'AK-47 | Redline', 'Field Tested', 'default', 'rifles', '/img/1.png')");

    await createMigrator(sequelize, { quiet: true }).up({ to: MIGRATION });

    const column = await gradeColumn(sequelize);
    assert.ok(column, 'items.grade exists');
    assert.strictEqual(column.Null, 'YES');
    const [[item]] = await sequelize.query('SELECT name, grade FROM items WHERE itemId = 1');
    assert.deepStrictEqual({ ...item }, { name: 'AK-47 | Redline', grade: null });
});

test('reverting the migration drops the grade and keeps the items', async () => {
    const sequelize = await databaseAt(MIGRATION);
    await sequelize.query("INSERT INTO items (itemId, name, rare, colors, type, imagePath, grade) VALUES (1, 'AK-47 | Redline', 'Field Tested', 'default', 'rifles', '/img/1.png', 'classified')");

    await createMigrator(sequelize, { quiet: true }).down({ to: MIGRATION });

    assert.strictEqual(await gradeColumn(sequelize), null);
    const [rows] = await sequelize.query('SELECT name FROM items');
    assert.deepStrictEqual(rows.map((row) => row.name), ['AK-47 | Redline']);
});

test('the migration leaves a grade column that already exists alone', async () => {
    const sequelize = await databaseAt(PREVIOUS);
    await sequelize.query('ALTER TABLE items ADD COLUMN grade VARCHAR(16) NULL');

    await createMigrator(sequelize, { quiet: true }).up({ to: MIGRATION });

    assert.ok(await gradeColumn(sequelize));
});
