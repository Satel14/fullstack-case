const test = require('node:test');
const assert = require('node:assert');
const MESSAGE = require('../src/constant/responseMessages');

const texts = (node, at = '') => (typeof node === 'string'
    ? [[at, node]]
    : Object.entries(node).flatMap(([key, child]) => texts(child, at ? `${at}.${key}` : key)));

const UNTRUE = [
    /Epic/,
    /грош/i,
];

test('no server text contradicts what the site says about itself', () => {
    const offending = texts(MESSAGE)
        .filter(([, text]) => UNTRUE.some((pattern) => pattern.test(text)))
        .map(([key]) => key);

    assert.deepStrictEqual(offending, []);
});

test('no server text uses the modifier apostrophe, which the site fonts lack', () => {
    const offending = texts(MESSAGE)
        .filter(([, text]) => /ʼ/.test(text))
        .map(([key]) => key);

    assert.deepStrictEqual(offending, []);
});
