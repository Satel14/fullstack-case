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
    return buildCases(readJson('priceMap.json'), readJson('gradeMap.json'));
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

test('the committed priceMap.json prices every item of the image tree under its id', () => {
    const { enumerateItems } = require('../scripts/lib/enumerateItems');
    const { priceMapGaps } = require('../scripts/lib/priceMapCoverage');

    assert.deepStrictEqual(priceMapGaps(enumerateItems(), readJson('priceMap.json')), { missing: [], mismatched: [] });
});

test('the committed casePrices.json prices every case in _all.js and nothing else', () => {
    const allCases = require('../src/constant/cases/_all');
    assert.deepStrictEqual(Object.keys(readJson('casePrices.json')).sort(), Object.keys(allCases).sort());
});

test('the committed gradeMap.json gives every item of the image tree a known grade, and nothing else', () => {
    const { enumerateItems } = require('../scripts/lib/enumerateItems');
    const { GRADES } = require('../scripts/lib/marketGrade');
    const grades = readJson('gradeMap.json');

    assert.deepStrictEqual(Object.keys(grades).sort(), enumerateItems().map((item) => String(item.itemId)).sort());
    assert.deepStrictEqual(Object.entries(grades).filter(([, grade]) => !GRADES.includes(grade)), []);
});

test('every item of every committed case sits in the bucket of its grade, weighted as a CS2 weapon case', () => {
    const allCases = require('../src/constant/cases/_all');
    const grades = readJson('gradeMap.json');

    for (const [id, caseDef] of Object.entries(allCases)) {
        const weights = Object.fromEntries(Object.entries(caseDef.CHANCES).filter(([key]) => key !== 'COLORS'));
        assert.deepStrictEqual(weights, {
            milspec: 7992, restricted: 1598, classified: 320, covert: 64, special: 26,
        }, id);
        caseDef.ITEMS.forEach((item) => assert.strictEqual(grades[item.id], item.rare, `${id}: item ${item.id}`));
    }
});
