const test = require('node:test');
const assert = require('node:assert/strict');
const { fallbackPriceUSD } = require('./fallbackPrice');
const ITEMS = require('../../src/constant/itemConfigs');

const knifeFN = { name: 'Bayonet | Fade', type: ITEMS.TYPE.KNIFE, rare: ITEMS.RARITY.FACTORY_NEW };
const pistolFN = { name: 'Glock-18 | Sand Dune', type: ITEMS.TYPE.PISTOLS, rare: ITEMS.RARITY.FACTORY_NEW };

test('is deterministic for the same input', () => {
  assert.equal(fallbackPriceUSD(knifeFN), fallbackPriceUSD(knifeFN));
});

test('knives are worth more than pistols', () => {
  assert.ok(fallbackPriceUSD(knifeFN) > fallbackPriceUSD(pistolFN));
});

test('Factory New is worth more than Battle-Scarred for the same skin', () => {
  const fn = fallbackPriceUSD({ ...pistolFN, rare: ITEMS.RARITY.FACTORY_NEW });
  const bs = fallbackPriceUSD({ ...pistolFN, rare: ITEMS.RARITY.BATTLE_SCARRED });
  assert.ok(fn > bs);
});

test('never returns below the floor', () => {
  assert.ok(fallbackPriceUSD(pistolFN) >= 0.03);
});
