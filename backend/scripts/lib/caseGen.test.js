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

test('extreme value outliers never leak into a case (proximity window honored)', () => {
  const pool = [];
  for (let i = 1; i <= 200; i++) pool.push({ itemId: i, isKnife: false, evValue: 1 + (i % 50) * 40 });
  for (let i = 201; i <= 220; i++) pool.push({ itemId: i, isKnife: true, evValue: 800 + (i % 20) * 200 });
  const OUTLIER = 999;
  pool.push({ itemId: OUTLIER, isKnife: false, evValue: 10000000 });
  for (let s = 0; s < 30; s++) {
    const c = generateCase({ archetype: 'budget', pool, rng: makeRng(`seed${s}`) });
    assert.ok(!c.ids.includes(OUTLIER), `outlier leaked with seed ${s}`);
  }
});

test('jackpot still gets exactly one knife when no knife falls in the band', () => {
  const pool = [];
  for (let i = 1; i <= 200; i++) pool.push({ itemId: i, isKnife: false, evValue: 1 + (i % 50) * 40 });
  for (let i = 201; i <= 205; i++) pool.push({ itemId: i, isKnife: true, evValue: 500000 });
  const c = generateCase({ archetype: 'budget', pool, rng: makeRng('k') });
  const jackpotKey = BUCKETS[BUCKETS.length - 1].key;
  const jackpot = c.ITEMS.filter((it) => it.rare === jackpotKey);
  assert.equal(jackpot.length, 1);
  assert.ok(pool.find((p) => p.itemId === jackpot[0].id).isKnife);
});

test('ev equals the probability-weighted sum of item values', () => {
  const pool = [];
  for (let i = 1; i <= 400; i++) pool.push({ itemId: i, isKnife: false, evValue: 1 + (i % 100) * 50 });
  for (let i = 401; i <= 440; i++) pool.push({ itemId: i, isKnife: true, evValue: 800 + (i % 40) * 5000 });
  const c = generateCase({ archetype: 'standard', pool, rng: makeRng('ev') });
  const total = Object.keys(c.CHANCES).filter((k) => k !== 'COLORS').reduce((a, k) => a + c.CHANCES[k], 0);
  let ev = 0;
  for (const it of c.ITEMS) {
    const inBucket = c.ITEMS.filter((x) => x.rare === it.rare).length;
    const p = c.CHANCES[it.rare] / total / inBucket;
    ev += p * pool.find((x) => x.itemId === it.id).evValue;
  }
  assert.ok(Math.abs(ev - c.ev) < 1e-6, `recomputed ev=${ev} vs c.ev=${c.ev}`);
});
