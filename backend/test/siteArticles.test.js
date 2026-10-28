const test = require('node:test');
const assert = require('node:assert');
const { recreateTestDatabase } = require('./helpers/db');
const { createMigrator } = require('../src/db/migrator');
const mailSender = require('../src/modules/mailSender');

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

const listAfter = (html, heading) => {
    const section = html.split(`<h3>${heading}</h3>`)[1].split('</ul>')[0];
    return [...section.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) => match[1]);
};

test('the chat rules in the service rules are word for word the rules the chat shows, in both languages', async () => {
    const sequelize = await databaseAt(MIGRATION);
    const uk = require('../../frontend/src/i18n/locales/uk/translation.json');
    const en = require('../../frontend/src/i18n/locales/en/translation.json');
    const ruleKeys = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'];

    const [[rules]] = await sequelize.query('SELECT text, textEn FROM articles WHERE id = 6');

    assert.deepStrictEqual(listAfter(rules.text, 'Чат'), ruleKeys.map((key) => uk.rules[key]));
    assert.deepStrictEqual(listAfter(rules.textEn, 'Chat'), ruleKeys.map((key) => en.rules[key]));
});

const LETTERS = {
    emailConfirmationEmail: { uk: 'підтвердження реєстрації', en: 'registration confirmation' },
    welcomeEmail: { uk: 'привітання', en: 'welcome letter' },
    registrationAttemptEmail: { uk: 'спробу зареєструватися', en: 'tries to register' },
    passwordResetEmail: { uk: 'відновлення пароля', en: 'password reset' },
};

test('the data section of the user agreement names every stored item, every letter and everyone who gets the data', async () => {
    const sequelize = await databaseAt(MIGRATION);

    const [[agreement]] = await sequelize.query('SELECT text, textEn FROM articles WHERE id = 3');

    const dataSection = (html, heading) => html.split(heading)[1];
    const uk = dataSection(agreement.text, '<h3>6. Дані</h3>');
    ['логін', 'адресу пошти', 'хеш пароля', 'інформацію для виводу', 'Steam', 'повідомлення в чаті', 'історію дій',
        'Крім вас, на сайті пошту бачать лише адміністратори', 'Resend', 'текст кожного листа', 'разове посилання', 'IP-адресу',
        'номер вашого акаунта', ...Object.values(LETTERS).map((letter) => letter.uk)]
        .forEach((item) => assert.ok(uk.includes(item), `uk §6 misses "${item}"`));
    const en = dataSection(agreement.textEn, '<h3>6. Your data</h3>');
    ['login', 'email address', 'password hash', 'item withdrawal information', 'Steam', 'chat messages', 'history',
        'Apart from you, only the site administrators can see', 'Resend', 'text of each letter', 'one-time link', 'IP address',
        'account number', ...Object.values(LETTERS).map((letter) => letter.en)]
        .forEach((item) => assert.ok(en.includes(item), `en §6 misses "${item}"`));
});

test('the agreement accounts for every letter the site can send', () => {
    const templates = Object.keys(mailSender).filter((name) => name.endsWith('Email'));

    assert.deepStrictEqual(templates.sort(), Object.keys(LETTERS).sort());
});
