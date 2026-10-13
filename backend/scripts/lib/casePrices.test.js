const test = require('node:test');
const assert = require('node:assert/strict');
const { missingCasePrices, requireCasePrices } = require('./casePrices');

const ids = ['bomj', 'havoc', 'zephyr'];

test('nothing is missing when every case has a positive whole price', () => {
  assert.deepEqual(missingCasePrices(ids, { bomj: 82, havoc: 1453, zephyr: 104 }), []);
});

test('every case without a usable price is named, in case order', () => {
  assert.deepEqual(missingCasePrices(ids, { havoc: 1453 }), ['bomj', 'zephyr']);
  assert.deepEqual(missingCasePrices(ids, {}), ids);
  assert.deepEqual(
    missingCasePrices(ids, { bomj: 0, havoc: '1453', zephyr: null }),
    ids,
  );
  assert.deepEqual(missingCasePrices(ids, { bomj: -5, havoc: 12.5, zephyr: 104 }), ['bomj', 'havoc']);
});

test('inherited object keys are not prices', () => {
  assert.deepEqual(missingCasePrices(['constructor', 'toString'], {}), ['constructor', 'toString']);
});

test('requireCasePrices refuses, naming the cases without a price', () => {
  assert.throws(
    () => requireCasePrices(ids, { havoc: 1453 }),
    (error) => /2 of 3 cases/.test(error.message) && /bomj, zephyr/.test(error.message),
  );
  assert.doesNotThrow(() => requireCasePrices(ids, { bomj: 82, havoc: 1453, zephyr: 104 }));
});
