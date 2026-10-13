const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const CASES_DIR = path.join(BACKEND, 'src', 'constant', 'cases');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(BACKEND, 'scripts', 'data', file), 'utf8'));
const readCaseFile = (name) => fs.readFileSync(path.join(CASES_DIR, name), 'utf8').replace(/\r\n/g, '\n');

const generated = () => {
    const { buildCases } = require('../scripts/generateCases');
    return buildCases(readJson('priceMap.json'));
};

test('the committed priceMap.json regenerates exactly the committed case files', () => {
    const { files } = generated();

    assert.deepStrictEqual(
        Object.keys(files).sort(),
        fs.readdirSync(CASES_DIR).filter((name) => name.endsWith('.js')).sort(),
    );
    for (const [name, content] of Object.entries(files)) {
        assert.strictEqual(content, readCaseFile(name), `${name} differs from what priceMap.json generates`);
    }
});

test('the committed casePrices.json holds the prices the committed priceMap.json yields', () => {
    assert.deepStrictEqual(generated().casePrices, readJson('casePrices.json'));
});

test('the committed casePrices.json prices every case in _all.js and nothing else', () => {
    const allCases = require('../src/constant/cases/_all');
    assert.deepStrictEqual(Object.keys(readJson('casePrices.json')).sort(), Object.keys(allCases).sort());
});
