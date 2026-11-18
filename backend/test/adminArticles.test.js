const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcrypt');
const { resetTestDatabase } = require('./helpers/db');

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

const { validationResult } = require('express-validator');
const ROLES = require('../src/constant/enums/roles');
const MESSAGE = require('../src/constant/responseMessages');
const sequelize = require('../src/config/db');
const ArticlesController = require('../src/controllers/admin/articles');
const AdminActionService = require('../src/services/adminAction');
const { signToken } = require('../src/auth/token');
const { buildApp } = require('../app');

test.after(async () => {
    await sequelize.close();
});

const makeUser = async (login, role) => {
    const hash = await bcrypt.hash('secret123', 4);
    const [id] = await sequelize.query(
        'INSERT INTO users (login, password, email, balance, `rank`, role) VALUES (?, ?, ?, 0, 0, ?)',
        { replacements: [login, hash, `${login}@e.ua`, role] },
    );
    return id;
};

const freshSite = async () => {
    await resetTestDatabase();
    await sequelize.query("UPDATE articles SET updated_at = '2026-01-01 00:00:00'");
    return {
        adminId: await makeUser('boss', ROLES.ADMINISTRATOR),
        playerId: await makeUser('player', ROLES.NORMAL),
    };
};

const respond = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); },
    };
    handler(req, res);
});

const checkedBy = async (rules, req) => {
    await Promise.all(rules.map((rule) => rule.run(req)));
    return req;
};

const saveArticle = async (id, body, adminId) => respond(
    ArticlesController.update,
    await checkedBy(ArticlesController.validate('update'), {
        params: { id: String(id) }, body, user: { profile: { user_id: adminId } },
    }),
);

const listArticles = () => respond(ArticlesController.list, { query: {} });

const stored = async (id) => {
    const [rows] = await sequelize.query(
        'SELECT title, text, titleEn, textEn, updated_at FROM articles WHERE id = ?',
        { replacements: [id] },
    );
    return rows[0];
};

const journal = async () => {
    const [rows] = await sequelize.query('SELECT adminId, action, targetType, targetId, payload FROM admin_actions ORDER BY id');
    return rows.map((row) => ({ ...row, payload: JSON.parse(row.payload) }));
};

const withLogsCaught = async (fn) => {
    const logged = [];
    const originalError = console.error;
    const originalLog = console.log;
    console.error = (...args) => { logged.push(args.map(String).join(' ')); };
    console.log = (...args) => { logged.push(args.map(String).join(' ')); };
    try {
        return { result: await fn(), logged };
    } finally {
        console.error = originalError;
        console.log = originalLog;
    }
};

const edited = {
    article_title: '  Правила  ',
    article_text: '<p onclick="steal()">Нові правила<script>alert(1)</script></p>',
    article_titleEn: 'Rules',
    article_textEn: '<p>New rules</p><img src="x" onerror="alert(1)">',
};

test('the article list gives every article in both languages', async () => {
    await freshSite();

    const { code, payload } = await listArticles();

    assert.strictEqual(code, 200);
    assert.deepStrictEqual(payload.data.map((article) => article.article_id), [3, 6, 8, 9]);
    payload.data.forEach((article) => {
        ['article_title', 'article_text', 'article_titleEn', 'article_textEn'].forEach((field) => {
            assert.ok(article[field], `article ${article.article_id} has no ${field}`);
        });
    });
});

test('a saved article is stored cleaned, answered as stored and journalled without its texts', async () => {
    const { adminId } = await freshSite();
    const before = await stored(6);

    const { code, payload } = await saveArticle(6, edited, adminId);

    const after = await stored(6);
    assert.strictEqual(code, 200);
    assert.deepStrictEqual(
        [after.title, after.text, after.titleEn, after.textEn],
        ['Правила', '<p>Нові правила</p>', 'Rules', '<p>New rules</p>'],
    );
    assert.ok(new Date(after.updated_at) > new Date('2026-01-02T00:00:00Z'), 'the update time moves on');
    assert.deepStrictEqual(
        [payload.data.article_id, payload.data.article_title, payload.data.article_text, payload.data.article_titleEn, payload.data.article_textEn],
        [6, 'Правила', '<p>Нові правила</p>', 'Rules', '<p>New rules</p>'],
    );

    const entries = await journal();
    assert.deepStrictEqual(entries, [{
        adminId,
        action: 'article.update',
        targetType: 'article',
        targetId: '6',
        payload: {
            changed: ['title', 'text', 'titleEn', 'textEn'],
            before: { title: before.title, titleEn: before.titleEn },
            after: { title: 'Правила', titleEn: 'Rules' },
        },
    }]);
});

test('only the fields that differ are named in the journal, and a save that changes nothing writes nothing', async () => {
    const { adminId } = await freshSite();
    const current = await stored(3);
    const unchanged = {
        article_title: current.title,
        article_text: current.text,
        article_titleEn: current.titleEn,
        article_textEn: current.textEn,
    };

    const same = await saveArticle(3, unchanged, adminId);
    assert.strictEqual(same.code, 200);
    assert.strictEqual(same.payload.data.article_text, current.text);
    assert.deepStrictEqual(await journal(), []);
    assert.strictEqual(new Date((await stored(3)).updated_at).toISOString(), new Date(current.updated_at).toISOString());

    const renamed = await saveArticle(3, { ...unchanged, article_titleEn: 'Terms of use' }, adminId);
    assert.strictEqual(renamed.code, 200);
    assert.deepStrictEqual((await journal()).map((entry) => entry.payload.changed), [['titleEn']]);
});

test('an English text without visible text is stored empty, so English readers get the Ukrainian version', async () => {
    const { adminId } = await freshSite();

    const { code } = await saveArticle(8, { ...edited, article_textEn: '<p>&#8203;</p><textarea>English text</textarea>' }, adminId);

    assert.strictEqual(code, 200);
    assert.strictEqual((await stored(8)).textEn, '');
});

test('a long text whose markup cleans away fits, and only the cleaned bytes are measured', async () => {
    const { adminId } = await freshSite();

    const { code } = await saveArticle(6, { ...edited, article_text: `<p>ok</p><!--${'x'.repeat(70000)}-->` }, adminId);

    assert.strictEqual(code, 200);
    assert.strictEqual((await stored(6)).text, '<p>ok</p>');
});

test('an English text may be left empty, so English readers get the Ukrainian version', async () => {
    const { adminId } = await freshSite();

    const { code } = await saveArticle(8, { ...edited, article_titleEn: '', article_textEn: '' }, adminId);

    const after = await stored(8);
    assert.strictEqual(code, 200);
    assert.deepStrictEqual([after.titleEn, after.textEn], ['', '']);
});

test('an article that does not exist, a Ukrainian text that cleans to nothing and a text past the column are refused', async () => {
    const { adminId } = await freshSite();
    const before = await stored(9);
    const tooLong = `<p>${'ї'.repeat(33000)}</p>`;

    const answers = [
        await saveArticle(77, edited, adminId),
        await saveArticle(9, { ...edited, article_text: '<p><script>alert(1)</script><img src="x"></p>' }, adminId),
        await saveArticle(9, { ...edited, article_text: tooLong }, adminId),
        await saveArticle(9, { ...edited, article_textEn: tooLong }, adminId),
    ];

    assert.deepStrictEqual(answers.map(({ code, payload }) => [code, payload.message]), [
        [422, MESSAGE.ARTICLE.NOT_EXIST],
        [422, MESSAGE.ADMIN.ARTICLE_TEXT_EMPTY],
        [422, MESSAGE.ADMIN.ARTICLE_TOO_LONG],
        [422, MESSAGE.ADMIN.ARTICLE_TOO_LONG],
    ]);
    assert.deepStrictEqual(await stored(9), before);
    assert.deepStrictEqual(await journal(), []);
});

test('a save based on an older copy of the article is refused, so it cannot overwrite newer edits', async () => {
    const { adminId } = await freshSite();
    const before = await stored(6);
    const loadedAt = new Date(before.updated_at).toISOString();

    const first = await saveArticle(6, { ...edited, article_updatedAt: loadedAt }, adminId);
    const afterFirst = await stored(6);
    const stale = await saveArticle(6, { ...edited, article_titleEn: 'Old copy', article_updatedAt: loadedAt }, adminId);

    assert.strictEqual(first.code, 200);
    assert.deepStrictEqual([stale.code, stale.payload.message], [409, MESSAGE.ADMIN.ARTICLE_CHANGED]);
    assert.deepStrictEqual(await stored(6), afterFirst);
    assert.strictEqual((await journal()).length, 1);

    const fresh = await saveArticle(6, {
        ...edited, article_titleEn: 'New copy', article_updatedAt: new Date(afterFirst.updated_at).toISOString(),
    }, adminId);
    assert.strictEqual(fresh.code, 200);
    assert.strictEqual((await stored(6)).titleEn, 'New copy');
});

test('a save that does not say which copy it was based on is still taken, and a malformed moment is refused', async () => {
    const { adminId } = await freshSite();

    const unnamed = await saveArticle(6, edited, adminId);
    const malformed = await saveArticle(6, { ...edited, article_updatedAt: 'yesterday' }, adminId);

    assert.deepStrictEqual([unnamed.code, malformed.code], [200, 422]);
});

test('a journal that cannot be written leaves the article as it was', async () => {
    const { adminId } = await freshSite();
    const before = await stored(6);
    const record = AdminActionService.record;
    AdminActionService.record = async () => { throw new Error('journal is down'); };

    try {
        const { result, logged } = await withLogsCaught(() => saveArticle(6, edited, adminId));

        assert.deepStrictEqual([result.code, result.payload.message], [500, MESSAGE.SERVER.ERROR]);
        assert.strictEqual(logged.length, 1);
        assert.match(logged[0], /journal is down/);
    } finally {
        AdminActionService.record = record;
    }
    assert.deepStrictEqual(await stored(6), before);
});

test('the save rules take what the editor sends and refuse anything else', async () => {
    const passes = async (params, body) => validationResult(
        await checkedBy(ArticlesController.validate('update'), { params, body }),
    ).isEmpty();
    const good = { id: '6' };

    assert.strictEqual(await passes(good, edited), true);
    assert.strictEqual(await passes(good, { ...edited, article_text: '', article_titleEn: '', article_textEn: '' }), true);
    assert.strictEqual(await passes(good, { ...edited, article_title: 'т'.repeat(255) }), true);

    const badIds = ['abc', '0', '-1', '02', '9'.repeat(400), '2147483648'];
    const badBodies = [
        ...Object.keys(edited).map((field) => {
            const { [field]: dropped, ...rest } = edited;
            return rest;
        }),
        ...Object.keys(edited).flatMap((field) => [5, ['x'], ['x', 'y'], { a: 1 }, null].map((value) => ({ ...edited, [field]: value }))),
        { ...edited, article_title: '   ' },
        { ...edited, article_title: 'т'.repeat(256) },
        { ...edited, article_titleEn: 'т'.repeat(256) },
    ];

    const verdicts = await Promise.all([
        ...badIds.map((id) => passes({ id }, edited)),
        ...badBodies.map((body) => passes(good, body)),
    ]);
    assert.deepStrictEqual(verdicts, verdicts.map(() => false));
});

const serveTheApp = async () => {
    const server = await new Promise((resolve) => {
        const s = buildApp().listen(0, '127.0.0.1', () => resolve(s));
    });
    return {
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((resolve) => { server.close(resolve); }),
    };
};

const send = async (url, { method = 'PUT', token, raw }) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(url, { method, headers, body: raw });
    const payload = await response.json();
    return [response.status, payload.message || payload.data.article_id];
};

test('an article save reads a body up to 256 KB, and only once the administrator is known', async () => {
    const { adminId, playerId } = await freshSite();
    const admin = signToken({ user_id: adminId, user_tokenVersion: 0 });
    const player = signToken({ user_id: playerId, user_tokenVersion: 0 });
    const withText = (size) => JSON.stringify({ ...edited, article_text: `<p>${'x'.repeat(size)}</p>` });
    const stand = await serveTheApp();

    try {
        const { result, logged } = await withLogsCaught(async () => [
            await send(`${stand.url}/api/admin/article/6`, { token: admin, raw: withText(40 * 1024) }),
            await send(`${stand.url}/api/admin/article/6`, { token: admin, raw: withText(260 * 1024) }),
            await send(`${stand.url}/api/admin/article/6`, { raw: '{"broken' }),
            await send(`${stand.url}/api/admin/article/6`, { token: player, raw: '{"broken' }),
            await send(`${stand.url}/api/admin/article/6`, { token: admin, raw: '{"broken' }),
            await send(`${stand.url}/api/admin/case/dust2`, { token: admin, raw: JSON.stringify({ case_title: 'x'.repeat(17 * 1024) }) }),
            await send(`${stand.url}/api/profile/login`, { method: 'POST', raw: JSON.stringify({ login: 'x'.repeat(17 * 1024) }) }),
        ]);

        assert.deepStrictEqual(result, [
            [200, 6],
            [413, MESSAGE.SERVER.BAD_REQUEST],
            [401, MESSAGE.AUTH.NOT_AUTHORIZED],
            [403, MESSAGE.ADMIN.NOT_ADMIN],
            [400, MESSAGE.SERVER.BAD_REQUEST],
            [413, MESSAGE.SERVER.BAD_REQUEST],
            [413, MESSAGE.SERVER.BAD_REQUEST],
        ]);
        assert.deepStrictEqual(logged, []);
    } finally {
        await stand.close();
    }
});
