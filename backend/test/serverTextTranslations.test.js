const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { CATALOGUE } = require('../src/middleware/messageCodes');

const LOCALES = path.join(__dirname, '..', '..', 'frontend', 'src', 'i18n', 'locales');
const uk = require(path.join(LOCALES, 'uk', 'translation.json')).server || {};
const en = require(path.join(LOCALES, 'en', 'translation.json')).server || {};
const TEMPLATES = ['PROMOCODE.ADDED', 'PROMOCODE.DESCRIPTION'];

const at = (tree, code) => code.split('.').reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), tree);

const codesIn = (node, prefix = '') => Object.entries(node).flatMap(([key, child]) => (typeof child === 'string'
    ? [`${prefix}${key}`]
    : codesIn(child, `${prefix}${key}.`)));

test('the Ukrainian site shows every server text exactly as the server words it', () => {
    const differing = CATALOGUE
        .filter(([code, text]) => (TEMPLATES.includes(code)
            ? !String(at(uk, code)).startsWith(text)
            : at(uk, code) !== text))
        .map(([code]) => code);

    assert.deepStrictEqual(differing, []);
});

test('the English site has a text for every server text', () => {
    const missing = CATALOGUE
        .filter(([code]) => typeof at(en, code) !== 'string' || !at(en, code).trim())
        .map(([code]) => code);

    assert.deepStrictEqual(missing, []);
});

test('the site translates no code the server does not send', () => {
    const known = new Set(CATALOGUE.map(([code]) => code));

    assert.deepStrictEqual(codesIn(uk).filter((code) => !known.has(code)), []);
    assert.deepStrictEqual(codesIn(en).filter((code) => !known.has(code)), []);
});

test('every code the server sends has the shape the site accepts', () => {
    assert.deepStrictEqual(CATALOGUE.map(([code]) => code).filter((code) => !/^[A-Z_]+\.[A-Z_]+$/.test(code)), []);
});

test('the promocode templates name their values in both languages', () => {
    for (const tree of [uk, en]) {
        assert.match(at(tree, 'PROMOCODE.ADDED'), /\{\{bonus\}\}/);
        assert.match(at(tree, 'PROMOCODE.DESCRIPTION'), /\{\{description\}\}/);
    }
});
