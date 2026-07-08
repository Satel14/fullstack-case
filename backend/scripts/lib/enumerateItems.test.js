const test = require('node:test');
const assert = require('node:assert/strict');
const { enumerateItems } = require('./enumerateItems');

test('enumerateItems returns a non-empty deterministic list', () => {
  const a = enumerateItems();
  const b = enumerateItems();
  assert.ok(a.length > 1000, `expected >1000 items, got ${a.length}`);
  assert.deepEqual(a.map((i) => i.itemId), b.map((i) => i.itemId));
});

test('itemIds are contiguous starting at 1', () => {
  const items = enumerateItems();
  assert.equal(items[0].itemId, 1);
  assert.equal(items[items.length - 1].itemId, items.length);
});

test('each item has a name "Weapon | Skin", a wear, and a type', () => {
  const item = enumerateItems()[0];
  assert.match(item.name, / \| /);
  assert.ok(['Factory New', 'Minimal wear', 'Field Tested', 'Well Worn', 'Battle Scarred'].includes(item.rare));
  assert.ok(item.type && item.type !== 'unknown');
});

test('knives (category Other) map to type "knife"', () => {
  const knife = enumerateItems().find((i) => i.category === 'Other');
  assert.equal(knife.type, 'knife');
});
