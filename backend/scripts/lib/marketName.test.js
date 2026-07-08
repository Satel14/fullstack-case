const test = require('node:test');
const assert = require('node:assert/strict');
const { toMarketHashName, wearToMarket, isKnife } = require('./marketName');
const ITEMS = require('../../src/constant/itemConfigs');

test('wearToMarket maps codebase wear to Steam wear', () => {
  assert.equal(wearToMarket(ITEMS.RARITY.FACTORY_NEW), 'Factory New');
  assert.equal(wearToMarket(ITEMS.RARITY.MINIMAL_WEAR), 'Minimal Wear');
  assert.equal(wearToMarket(ITEMS.RARITY.FIELD_TESTED), 'Field-Tested');
  assert.equal(wearToMarket(ITEMS.RARITY.WELL_WORN), 'Well-Worn');
  assert.equal(wearToMarket(ITEMS.RARITY.BATTLE_SCARRED), 'Battle-Scarred');
});

test('toMarketHashName formats a rifle without a prefix', () => {
  assert.equal(
    toMarketHashName({ name: 'AK-47 | Redline', type: ITEMS.TYPE.ASSAULT_RIFLES, rare: ITEMS.RARITY.FIELD_TESTED }),
    'AK-47 | Redline (Field-Tested)',
  );
});

test('toMarketHashName prefixes knives with a star', () => {
  assert.equal(
    toMarketHashName({ name: 'Bayonet | Fade', type: ITEMS.TYPE.KNIFE, rare: ITEMS.RARITY.FACTORY_NEW }),
    '★ Bayonet | Fade (Factory New)',
  );
});

test('isKnife detects the knife type', () => {
  assert.equal(isKnife(ITEMS.TYPE.KNIFE), true);
  assert.equal(isKnife(ITEMS.TYPE.PISTOLS), false);
});
