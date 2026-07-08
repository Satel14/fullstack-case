const test = require('node:test');
const assert = require('node:assert/strict');
const { generateCase, makeRng, BUCKETS, HOUSE_RETURN } = require('./caseGen');

const makePool = () => {
  const pool = [];
  for (let i = 1; i <= 400; i++) {
    pool.push({ itemId: i, isKnife: false, evValue: 1 + (i % 100) * 50 });
  }
  for (let i = 401; i <= 440; i++) {
    pool.push({ itemId: i, isKnife: true, evValue: 800 + (i % 40) * 5000 });
  }
  return pool;
};

test('CHANCES (excluding COLORS) sum to 100', () => {
  const c = generateCase({ caseId: 'x', archetype: 'standard', pool: makePool(), rng: makeRng('x') });
  const sum = Object.keys(c.CHANCES).filter((k) => k !== 'COLORS').reduce((a, k) => a + c.CHANCES[k], 0);
  assert.equal(sum, 100);
});

test('produces the expected item count with no duplicate ids', () => {
  const c = generateCase({ caseId: 'x', archetype: 'standard', pool: makePool(), rng: makeRng('x') });
  const expected = BUCKETS.reduce((a, b) => a + b.count, 0);
  assert.equal(c.ITEMS.length, expected);
  assert.equal(new Set(c.ids).size, c.ids.length);
});

test('the jackpot bucket holds exactly one knife', () => {
  const c = generateCase({ caseId: 'x', archetype: 'standard', pool: makePool(), rng: makeRng('x') });
  const jackpotKey = BUCKETS[BUCKETS.length - 1].key;
  const jackpot = c.ITEMS.filter((it) => it.rare === jackpotKey);
  assert.equal(jackpot.length, 1);
  const pool = makePool();
  assert.equal(pool.find((p) => p.itemId === jackpot[0].id).isKnife, true);
});

test('price applies the ~15% house edge (ev/price ≈ 0.85)', () => {
  const c = generateCase({ caseId: 'x', archetype: 'standard', pool: makePool(), rng: makeRng('x') });
  assert.ok(c.price > 0);
  assert.ok(Math.abs(c.ev / c.price - HOUSE_RETURN) < 0.02, `ev/price=${c.ev / c.price}`);
});

test('is deterministic for the same seed', () => {
  const a = generateCase({ caseId: 'dust2', archetype: 'standard', pool: makePool(), rng: makeRng('dust2') });
  const b = generateCase({ caseId: 'dust2', archetype: 'standard', pool: makePool(), rng: makeRng('dust2') });
  assert.deepEqual(a.ids, b.ids);
  assert.equal(a.price, b.price);
});
