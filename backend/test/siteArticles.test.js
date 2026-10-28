const test = require('node:test');
const assert = require('node:assert');
const { recreateTestDatabase } = require('./helpers/db');
const { createMigrator } = require('../src/db/migrator');

const MIGRATION = '20261028000100-site-articles.js';
const PREVIOUS = '20261028000000-article-translations.js';
const SITE_ARTICLES = [3, 6, 8, 9];

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

const articles = async (sequelize) => {
    const [rows] = await sequelize.query('SELECT id, title, text, titleEn, textEn FROM articles ORDER BY id');
    return rows;
};

test('the agreement, the rules, the ways to get credits and the contacts exist in Ukrainian and English', async () => {
    const sequelize = await databaseAt(MIGRATION);

    const rows = await articles(sequelize);

    assert.deepStrictEqual(rows.map((row) => row.id), SITE_ARTICLES);
    rows.forEach((row) => {
        [row.title, row.text, row.titleEn, row.textEn].forEach((value) => assert.ok(value && value.trim(), `article ${row.id} has an empty field`));
        assert.doesNotMatch(`${row.title} ${row.text}`, /[ыэёъЫЭЁЪ]/, `article ${row.id} must not contain Russian letters`);
        assert.doesNotMatch(`${row.titleEn} ${row.textEn}`, /[а-яіїєґА-ЯІЇЄҐ]/, `article ${row.id} English text must not contain Cyrillic`);
    });
    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
    assert.match(byId[3].text, /віртуальн/);
    assert.match(byId[3].textEn, /virtual currency/);
    assert.match(byId[9].text, /чат/);
});

test('an article that already has an id the site uses keeps its own text', async () => {
    const sequelize = await databaseAt(PREVIOUS);
    await sequelize.query("INSERT INTO articles (id, title, text) VALUES (6, 'Наші правила', '<p>Свої правила</p>')");

    await createMigrator(sequelize, { quiet: true }).up({ to: MIGRATION });

    const rows = await articles(sequelize);
    assert.deepStrictEqual(rows.map((row) => row.id), SITE_ARTICLES);
    const rules = rows.find((row) => row.id === 6);
    assert.deepStrictEqual([rules.title, rules.text, rules.titleEn], ['Наші правила', '<p>Свої правила</p>', null]);
});

test('reverting removes the site articles, but keeps one that was retitled since', async () => {
    const sequelize = await databaseAt(MIGRATION);
    await sequelize.query("UPDATE articles SET title = 'Як заробити більше' WHERE id = 8");

    await createMigrator(sequelize, { quiet: true }).down({ to: MIGRATION });

    const rows = await articles(sequelize);
    assert.deepStrictEqual(rows.map((row) => [row.id, row.title]), [[8, 'Як заробити більше']]);
});
