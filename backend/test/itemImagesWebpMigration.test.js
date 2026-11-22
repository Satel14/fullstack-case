const test = require('node:test');
const assert = require('node:assert');
const { recreateTestDatabase } = require('./helpers/db');
const { createMigrator } = require('../src/db/migrator');

const MIGRATION = '20261122000000-item-images-webp.js';
const PREVIOUS = '20261118000200-admin-stats-indexes.js';

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

const insert = (sequelize, itemId, imagePath) => sequelize.query(
    "INSERT INTO items (itemId, name, rare, colors, type, imagePath) VALUES (?, 'X | Y', 'Field Tested', 'default', 'rifles', ?)",
    { replacements: [itemId, imagePath] },
);

const paths = async (sequelize) => {
    const [rows] = await sequelize.query('SELECT itemId, imagePath FROM items ORDER BY itemId');
    return rows.map((row) => row.imagePath);
};

test('the migration points every item picture at its WebP file and leaves other paths alone', async () => {
    const sequelize = await databaseAt(PREVIOUS);
    await insert(sequelize, 1, '/img/items/Rifles/AK-47/Redline.png');
    await insert(sequelize, 2, '/img/items/Heavy/M249/O.S.I.P.R..png');
    await insert(sequelize, 3, '/img/other/keep.png');
    await insert(sequelize, 4, '/img/items/Rifles/AK-47/Vulcan.webp');
    await insert(sequelize, 5, '/img/items-other/keep.png');
    await insert(sequelize, 6, '/img/items/Rifles/AK-47/Redline.png.backup');

    await createMigrator(sequelize, { quiet: true }).up({ to: MIGRATION });

    assert.deepStrictEqual(await paths(sequelize), [
        '/img/items/Rifles/AK-47/Redline.webp',
        '/img/items/Heavy/M249/O.S.I.P.R..webp',
        '/img/other/keep.png',
        '/img/items/Rifles/AK-47/Vulcan.webp',
        '/img/items-other/keep.png',
        '/img/items/Rifles/AK-47/Redline.png.backup',
    ]);
});

test('reverting the migration points the item pictures back at PNG files and leaves other paths alone', async () => {
    const sequelize = await databaseAt(MIGRATION);
    await insert(sequelize, 1, '/img/items/Rifles/AK-47/Redline.webp');
    await insert(sequelize, 2, '/img/items/Heavy/M249/O.S.I.P.R..webp');
    await insert(sequelize, 3, '/img/other/keep.webp');
    await insert(sequelize, 4, '/img/items/Rifles/AK-47/Vulcan.png');
    await insert(sequelize, 5, '/img/items-other/keep.webp');
    await insert(sequelize, 6, '/img/items/Rifles/AK-47/Redline.webp.backup');

    await createMigrator(sequelize, { quiet: true }).down({ to: MIGRATION });

    assert.deepStrictEqual(await paths(sequelize), [
        '/img/items/Rifles/AK-47/Redline.png',
        '/img/items/Heavy/M249/O.S.I.P.R..png',
        '/img/other/keep.webp',
        '/img/items/Rifles/AK-47/Vulcan.png',
        '/img/items-other/keep.webp',
        '/img/items/Rifles/AK-47/Redline.webp.backup',
    ]);
});
