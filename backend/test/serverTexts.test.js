const test = require('node:test');
const assert = require('node:assert');
const MESSAGE = require('../src/constant/responseMessages');
const { RUSSIAN, MONEY } = require('./helpers/ukrainian');

const texts = (node, at = '') => (typeof node === 'string'
    ? [[at, node]]
    : Object.entries(node).flatMap(([key, child]) => texts(child, at ? `${at}.${key}` : key)));

const UNTRUE = [
    /Epic/,
    MONEY,
];

test('no server text contradicts what the site says about itself', () => {
    const offending = texts(MESSAGE)
        .filter(([, text]) => UNTRUE.some((pattern) => pattern.test(text)))
        .map(([key]) => key);

    assert.deepStrictEqual(offending, []);
});

test('no server text uses Russian letters or Russian words', () => {
    const russian = texts(MESSAGE)
        .filter(([, text]) => RUSSIAN.some((pattern) => pattern.test(text)))
        .map(([key]) => key);

    assert.deepStrictEqual(russian, []);
});

test('no server text uses the modifier apostrophe, which the site fonts lack', () => {
    const offending = texts(MESSAGE)
        .filter(([, text]) => /ʼ/.test(text))
        .map(([key]) => key);

    assert.deepStrictEqual(offending, []);
});
