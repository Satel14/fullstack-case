import { cleanArticleHtml } from './articleHtml';

test('the formatting an article may use is kept', () => {
    const html = '<h2>A</h2><h3>B</h3><h4>C</h4>'
        + '<p>x<br>y <strong>s</strong> <em>e</em> <b>b</b> <i>i</i> «лапки» it\'s ₴</p>'
        + '<ul><li>1</li></ul><ol><li>2</li></ol><blockquote>q</blockquote>'
        + '<a href="/article/6">r</a><a href="#top">t</a><a href="https://example.com/?a=1&amp;b=2">e</a><a href="mailto:help@example.com">m</a>';

    expect(cleanArticleHtml(html)).toBe(html);
});

test('scripts, styles, event handlers, frames and images are removed', () => {
    const dirty = '<p onclick="steal()" style="color:red" class="x" id="y" data-x="1" aria-label="z">a<script>alert(1)</script></p>'
        + '<style>p { color: red }</style><img src="x" onerror="alert(1)"><iframe src="https://evil.example"></iframe>'
        + '<svg onload="alert(1)"></svg><form action="/x"><button>go</button></form>';

    expect(cleanArticleHtml(dirty)).toBe('<p>a</p>go');
});

test('a link keeps only a web, mail or site address', () => {
    const emptied = [
        // eslint-disable-next-line no-script-url
        'javascript:alert(1)',
        // eslint-disable-next-line no-script-url
        'JaVaScRiPt:alert(1)',
        ' javascript:alert(1)',
        'data:text/html,x',
        '//evil.example/',
        '/\\evil.example/',
        'article/6',
        'tel:+380000000000',
    ];

    expect(emptied.map((href) => cleanArticleHtml(`<a href="${href}" target="_blank" rel="opener">x</a>`)))
        .toEqual(emptied.map(() => '<a>x</a>'));
});

test('nothing at all gives an empty text', () => {
    expect(cleanArticleHtml(undefined)).toBe('');
    expect(cleanArticleHtml(null)).toBe('');
});
