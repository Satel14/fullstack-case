const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPriceEntry, STATTRAK_MULT } = require('./priceEntry');
const ITEMS = require('../../src/constant/itemConfigs');

const rate = 40;
const redline = { name: 'AK-47 | Redline', type: ITEMS.TYPE.ASSAULT_RIFLES, rare: ITEMS.RARITY.FIELD_TESTED };

test('matched item uses market price for default and StatTrak for painted', () => {
  const idx = new Map([
    ['AK-47 | Redline (Field-Tested)', 10],
    ['StatTrak™ AK-47 | Redline (Field-Tested)', 25],
  ]);
  const e = buildPriceEntry(redline, idx, rate);
  assert.equal(e.matched, true);
  assert.equal(e.default, 400);
  assert.equal(e.painted, 1000);
});

test('painted falls back to default * STATTRAK_MULT when no StatTrak listing', () => {
  const idx = new Map([['AK-47 | Redline (Field-Tested)', 10]]);
  const e = buildPriceEntry(redline, idx, rate);
  assert.equal(e.default, 400);
  assert.equal(e.painted, Math.round(10 * STATTRAK_MULT * rate));
});

test('unmatched item uses the fallback model and is flagged', () => {
  const e = buildPriceEntry(redline, new Map(), rate);
  assert.equal(e.matched, false);
  assert.ok(e.default >= 1);
  assert.ok(e.painted >= e.default);
});

test('a different wear of the same skin is used when the exact wear is missing', () => {
  const idx = new Map([['AK-47 | Redline (Minimal Wear)', 12]]);
  const e = buildPriceEntry(redline, idx, rate);
  assert.equal(e.matched, true);
  assert.equal(e.default, 480);
});
