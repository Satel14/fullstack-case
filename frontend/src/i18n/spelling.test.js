import uk from './locales/uk/translation.json';
import en from './locales/en/translation.json';

const texts = (node, at = '') => (typeof node === 'string'
    ? [[at, node]]
    : Object.entries(node).flatMap(([key, child]) => texts(child, at ? `${at}.${key}` : key)));

const RUSSIAN = [
    /[ыэёъ]/i,
    /почт/i,
    /аккаунт/i,
    /співпа[дл]/i,
    /не\s?вірн/i,
    /\}\}\s*назад/i,
];

test('the Ukrainian texts use no Russian letters or Russian words', () => {
    const russian = texts(uk)
        .filter(([, text]) => RUSSIAN.some((pattern) => pattern.test(text)))
        .map(([key]) => key);

    expect(russian).toEqual([]);
});

test('no text uses the modifier apostrophe, which the site fonts lack', () => {
    const modifierApostrophe = [...texts(uk).map(([key, text]) => [`uk ${key}`, text]), ...texts(en).map(([key, text]) => [`en ${key}`, text])]
        .filter(([, text]) => /ʼ/.test(text))
        .map(([key]) => key);

    expect(modifierApostrophe).toEqual([]);
});
