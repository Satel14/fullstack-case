const test = require('node:test');
const assert = require('node:assert/strict');
const { itemPool, evenlyByValue, valueBand } = require('./itemPool');

const items = (count) => Object.freeze(Array.from({ length: count }, (_, i) => (
    Object.freeze({ itemId: i + 1, value: i })
)).reverse());

test('the pool uses manifest categories and weapons, blends colour prices, and sorts by value then id', () => {
    const manifest = Object.freeze({
        'Other/Karambit/Doppler.webp': 50,
        'Rifles/AK-47/Redline.png': 10,
        'Pistols/Desert Eagle/Blaze.webp': 2,
        'Other/Zeus x27/Thunderbolt.webp': 11,
    });
    const priceMap = {
        50: { default: 100, painted: 200 },
        10: { default: 10, painted: 30 },
        2: { default: 10, painted: 30 },
        11: { default: 20, painted: 20 },
    };
    const gradeMap = { 50: 'special', 10: 'classified', 2: 'restricted', 11: 'milspec' };

    assert.deepEqual(itemPool({ manifest, priceMap, gradeMap }), [
        { itemId: 2, category: 'Pistols', weapon: 'Desert Eagle', grade: 'restricted', value: 12 },
        { itemId: 10, category: 'Rifles', weapon: 'AK-47', grade: 'classified', value: 12 },
        { itemId: 11, category: 'Other', weapon: 'Zeus x27', grade: 'milspec', value: 20 },
        { itemId: 50, category: 'Other', weapon: 'Karambit', grade: 'special', value: 110 },
    ]);
});

test('the pool omits items missing a price or a grade and entries outside the manifest', () => {
    const manifest = {
        'Rifles/AK-47/Redline.png': 1,
        'Rifles/AWP/Unpriced.webp': 2,
        'Pistols/Glock-18/Ungraded.png': 3,
    };
    const priceMap = {
        1: { default: 10, painted: 30 },
        3: { default: 20, painted: 20 },
        4: { default: 30, painted: 30 },
    };
    const gradeMap = { 1: 'classified', 2: 'covert', 4: 'consumer' };

    assert.deepEqual(itemPool({ manifest, priceMap, gradeMap }), [
        { itemId: 1, category: 'Rifles', weapon: 'AK-47', grade: 'classified', value: 12 },
    ]);
    assert.deepEqual(itemPool({ manifest: {}, priceMap, gradeMap }), []);
});

test('even sampling of ten items picks indices 0, 3, 6 and 9 in value order without mutating the input', () => {
    assert.deepEqual(evenlyByValue(items(10), 4).map((item) => item.value), [0, 3, 6, 9]);
});

test('even sampling keeps every item when there are no more items than requested', () => {
    const input = items(3);
    const expected = [input[2], input[1], input[0]];
    assert.deepEqual(evenlyByValue(input, 4), expected);
    assert.deepEqual(evenlyByValue(input, 3), expected);
});

test('even sampling handles an empty pool and requests for zero or one item', () => {
    assert.deepEqual(evenlyByValue([], 4), []);
    assert.deepEqual(evenlyByValue(items(3), 0), []);
    assert.deepEqual(evenlyByValue(items(3), 1), [{ itemId: 1, value: 0 }]);
});

test('the upper 30 percent band of eleven items contains the last four in value order', () => {
    assert.deepEqual(valueBand(items(11), 0.7, 1).map((item) => item.value), [7, 8, 9, 10]);
});

test('value bands round their quantile indices and include both endpoints', () => {
    assert.deepEqual(valueBand(items(11), 0.25, 0.55).map((item) => item.value), [3, 4, 5, 6]);
    assert.deepEqual(valueBand(items(11), 0.4, 0.4).map((item) => item.value), [4]);
    assert.deepEqual(valueBand(items(3), 0, 1).map((item) => item.value), [0, 1, 2]);
    assert.deepEqual(valueBand([], 0.7, 1), []);
});
