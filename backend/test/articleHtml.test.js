const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');
const { cleanArticleHtml, textOf } = require('../src/helpers/articleHtml');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

test('the articles the site ships come through the cleaning unchanged', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    const [rows] = await sequelize.query('SELECT id, text, textEn FROM articles ORDER BY id');

    assert.deepStrictEqual(rows.map((row) => row.id), [3, 6, 8, 9]);
    rows.forEach((row) => {
        assert.strictEqual(cleanArticleHtml(row.text), row.text, `article ${row.id}`);
        assert.strictEqual(cleanArticleHtml(row.textEn), row.textEn, `article ${row.id} in English`);
    });
});

test('the formatting an article may use is kept as written', () => {
    const html = '<h2>A</h2>\n<h3>B</h3>\n<h4>C</h4>\n'
        + '<p>x<br />y <strong>s</strong> <em>e</em> <b>b</b> <i>i</i> «лапки» "quotes" it\'s &amp; ₴</p>\n'
        + '<ul><li>1</li></ul><ol><li>2</li></ol><blockquote>q</blockquote>';

    assert.strictEqual(cleanArticleHtml(html), html);
});

test('scripts and styles go with their content, other markup loses its tags and attributes', () => {
    const cases = [
        ['<p>a<script>alert(1)</script>b</p>', '<p>ab</p>'],
        ['<p>a<style>p { color: red }</style>b</p>', '<p>ab</p>'],
        ['<p onclick="alert(1)" style="color:red" class="x" id="y" data-x="1">a</p>', '<p>a</p>'],
        ['<p>a<img src="x" onerror="alert(1)">b</p>', '<p>ab</p>'],
        ['<iframe src="https://evil.example"></iframe>', ''],
        ['<svg onload="alert(1)"><script>alert(1)</script></svg>', ''],
        ['<form action="/api/profile/reset"><button>go</button></form>', 'go'],
        ['<object data="x"></object><embed src="x">', ''],
        ['<p>a<!-- <script>alert(1)</script> -->b</p>', '<p>ab</p>'],
        ['<div><span>a</span></div><h1>b</h1><table><tr><td>c</td></tr></table>', 'abc'],
    ];

    assert.deepStrictEqual(cases.map(([dirty]) => cleanArticleHtml(dirty)), cases.map(([, clean]) => clean));
});

test('a link keeps only a web, mail or site address and nothing else', () => {
    const kept = [
        '<a href="https://steamcommunity.com/id/someone">s</a>',
        '<a href="http://example.com/page?a=1&amp;b=2">s</a>',
        '<a href="mailto:help@example.com">m</a>',
        '<a href="/provably-fair">p</a>',
        '<a href="/article/6#rules">r</a>',
        '<a href="#rules">r</a>',
        '<a href="HTTPS://example.com">s</a>',
    ];
    const emptied = [
        '<a href="article/6">x</a>',
        '<a href="/\\evil.example/">x</a>',
        '<a href="tel:+380000000000">x</a>',
        '<a href="ftp://example.com">x</a>',
        '<a href="javascript:alert(1)">x</a>',
        '<a href="JaVaScRiPt:alert(1)">x</a>',
        '<a href=" javascript:alert(1)">x</a>',
        '<a href="java&#x09;script:alert(1)">x</a>',
        '<a href="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;">x</a>',
        '<a href="vbscript:msgbox(1)">x</a>',
        '<a href="//evil.example/">x</a>',
    ];

    assert.deepStrictEqual(kept.map(cleanArticleHtml), kept);
    assert.deepStrictEqual(emptied.map(cleanArticleHtml), emptied.map(() => '<a>x</a>'));
    assert.strictEqual(
        cleanArticleHtml('<a href="https://example.com" target="_blank" rel="opener" title="t" onclick="x()">s</a>'),
        '<a href="https://example.com">s</a>',
    );
});

test('the text of an article is what a reader would see, without markup', () => {
    assert.strictEqual(textOf('<p>Привіт, <strong>світ</strong></p>'), 'Привіт, світ');
    assert.strictEqual(textOf('<p> </p>\n<ul><li></li></ul><br />'), '');
});
