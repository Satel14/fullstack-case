const test = require('node:test');
const assert = require('node:assert/strict');
const { priceMapGaps, requirePriceMapCoverage } = require('./priceMapCoverage');

const item = (itemId, name, rare = 'Factory New', type = 'pistols') => ({ itemId, name, rare, type });
const entry = ({ name, rare, type }, price = 100) => ({ name, type, rare, default: price, painted: price });

const items = [item(1, 'Glock-18 | Fade'), item(2, 'USP-S | Orion', 'Minimal wear'), item(3, 'P250 | Asiimov')];
const fullMap = { 1: entry(items[0]), 2: entry(items[1]), 3: entry(items[2]) };

test('a map with an entry for every item under its id has no gaps', () => {
  assert.deepEqual(priceMapGaps(items, fullMap), { missing: [], mismatched: [] });
});

test('items without an entry and entries describing another item are named', () => {
  const map = { 1: entry(items[1]), 3: { ...entry(items[2]), rare: 'Battle Scarred' } };
  assert.deepEqual(priceMapGaps(items, map), { missing: [2], mismatched: [1, 3] });
});

test('requirePriceMapCoverage refuses a stale map, naming the item ids', () => {
  assert.throws(
    () => requirePriceMapCoverage(items, { 1: entry(items[0]) }),
    (error) => /no price for 2 items: 2, 3/.test(error.message),
  );
  assert.throws(
    () => requirePriceMapCoverage(items, { ...fullMap, 2: entry(items[0]) }),
    (error) => /1 entries describe a different item: 2/.test(error.message),
  );
  assert.doesNotThrow(() => requirePriceMapCoverage(items, fullMap));
});

test('a long list of ids is cut short with a count', () => {
  const many = Array.from({ length: 25 }, (_, i) => item(i + 1, `Gun | ${i}`));
  assert.throws(
    () => requirePriceMapCoverage(many, {}),
    (error) => /no price for 25 items: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 and 15 more/.test(error.message),
  );
});
