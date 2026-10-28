import uk from './locales/uk/translation.json';

const texts = (node, at = '') => (typeof node === 'string'
    ? [[at, node]]
    : Object.entries(node).flatMap(([key, child]) => texts(child, at ? `${at}.${key}` : key)));

const RUSSIAN = [
    /[ыэёъ]/i,
    /почт/i,
    /аккаунт/i,
    /співпада/i,
    /\}\}\s*назад/i,
];

test('the Ukrainian texts use no Russian letters or Russian words', () => {
    const russian = texts(uk)
        .filter(([, text]) => RUSSIAN.some((pattern) => pattern.test(text)))
        .map(([key]) => key);

    expect(russian).toEqual([]);
});
