const { recreateTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createMigrator } = require('../src/db/migrator');

const MIGRATION = '20261122000200-case-images-webp.js';
const PREVIOUS = '20261122000100-case-categories.js';

let activeSequelize;

test.after(async () => {
    if (activeSequelize) await activeSequelize.close();
});

const databaseBeforeMigration = async () => {
    activeSequelize = await recreateTestDatabase();
    await createMigrator(activeSequelize, { quiet: true }).up({ to: PREVIOUS });
    return activeSequelize;
};

const insertCases = async (sequelize, images) => {
    for (const [id, image] of images.entries()) {
        await sequelize.query(
            'INSERT INTO cases (id, title, img, price, discount, categoryId, published, openedCount, openLimit, type) '
            + "VALUES (?, 'Kept title', ?, 500, 100, 1, 0, 42, 77, 'weapon')",
            { replacements: [String(id), image] },
        );
    }
};

const storedCases = async (sequelize) => {
    const [rows] = await sequelize.query('SELECT * FROM cases ORDER BY id');
    return rows;
};

test('the case-image migration changes only PNG paths under /img/case and keeps every other field', async () => {
    const sequelize = await databaseBeforeMigration();
    await insertCases(sequelize, [
        '/img/case/x.png', '/img/case/case-victory.png', '/img/case/case-victory.png',
        '/img/case/ready.webp', '/img/other.png', '/img/cases/other.png',
        'https://example.test/img/case/remote.png', '/img/case/query.png?v=1', null,
    ]);
    const before = await storedCases(sequelize);

    await createMigrator(sequelize, { quiet: true }).up({ to: MIGRATION });

    assert.deepEqual(await storedCases(sequelize), before.map((row, index) => ({
        ...row, img: index < 3 ? row.img.replace(/\.png$/, '.webp') : row.img,
    })));
    const after = await storedCases(sequelize);
    await require(`../migrations/${MIGRATION}`).up({ context: sequelize.getQueryInterface() });
    assert.deepEqual(await storedCases(sequelize), after);
});

test('reverting case images changes only WebP paths under /img/case and preserves all case rows', async () => {
    const sequelize = await databaseBeforeMigration();
    const migrator = createMigrator(sequelize, { quiet: true });
    await migrator.up({ to: MIGRATION });
    await insertCases(sequelize, [
        '/img/case/x.webp', '/img/case/knife-3.webp', '/img/case/already.png', '/img/other.webp',
        'https://example.test/img/case/remote.webp', null,
    ]);
    const before = await storedCases(sequelize);

    await migrator.down({ to: MIGRATION });

    assert.deepEqual(await storedCases(sequelize), before.map((row, index) => ({
        ...row, img: index < 2 ? row.img.replace(/\.webp$/, '.png') : row.img,
    })));
});
