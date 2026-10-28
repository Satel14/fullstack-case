const test = require('node:test');
const assert = require('node:assert');
const { recreateTestDatabase } = require('./helpers/db');
const { createMigrator } = require('../src/db/migrator');

const MIGRATION = '20261028000000-article-translations.js';

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
        json(payload) { resolve({ code: this.statusCode, payload: JSON.parse(JSON.stringify(payload)) }); },
    };
    handler(req, res);
});

const databaseAt = async (migration) => {
    const sequelize = await recreateTestDatabase();
    activeSequelize = sequelize;
    await createMigrator(sequelize, { quiet: true }).up({ to: migration });
    return sequelize;
};

test('an article keeps an English title and text beside the Ukrainian ones, and the API returns both', async () => {
    const sequelize = await databaseAt(MIGRATION);
    await sequelize.query(
        "INSERT INTO articles (id, title, text, titleEn, textEn) VALUES (42, 'Правила', '<p>Текст</p>', 'Rules', '<p>Text</p>')",
    );
    const ArticleController = require('../src/controllers/article');

    const answer = await respond(ArticleController.getArticleById, { params: { id: '42' } });

    assert.strictEqual(answer.code, 200);
    const { data } = answer.payload;
    assert.deepStrictEqual(
        [data.article_title, data.article_text, data.article_titleEn, data.article_textEn],
        ['Правила', '<p>Текст</p>', 'Rules', '<p>Text</p>'],
    );
});

test('reverting the migration drops only the English columns and keeps the Ukrainian articles', async () => {
    const sequelize = await databaseAt(MIGRATION);
    await sequelize.query(
        "INSERT INTO articles (id, title, text, titleEn, textEn) VALUES (7, 'Угода', '<p>Умови</p>', 'Terms', '<p>Terms</p>')",
    );

    await createMigrator(sequelize, { quiet: true }).down({ to: MIGRATION });

    const [columns] = await sequelize.query('SHOW COLUMNS FROM articles');
    assert.deepStrictEqual(columns.map((c) => c.Field).filter((f) => /en$/i.test(f)), []);
    const [[article]] = await sequelize.query('SELECT title, text FROM articles WHERE id = 7');
    assert.deepStrictEqual([article.title, article.text], ['Угода', '<p>Умови</p>']);
});
