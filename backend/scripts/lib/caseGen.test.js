const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateCase, makeRng, BUCKETS, TIERS, HOUSE_RETURN,
} = require('./caseGen');

const GRADES = ['milspec', 'restricted', 'classified', 'covert', 'special'];

const makePool = () => {
  const pool = [];
  let id = 1;
  GRADES.forEach((grade, g) => {
    for (let i = 0; i < 60; i++) {
      pool.push({ itemId: id++, grade, evValue: (g + 1) * 10 + i * (g + 1) * 5 });
    }
  });
  pool.push({ itemId: id++, grade: 'consumer', evValue: 1 });
  pool.push({ itemId: id++, grade: 'contraband', evValue: 999999 });
  return pool;
};

const bucketOf = (c, key) => c.ITEMS.filter((it) => it.rare === key);

test('the buckets are the CS2 weapon-case grades, weighted to 10000 so the whole-number roll is exact', () => {
  assert.deepEqual(BUCKETS.map(({ key, weight, count }) => [key, weight, count]), [
    ['milspec', 7992, 6], ['restricted', 1598, 4], ['classified', 320, 3], ['covert', 64, 2], ['special', 26, 1],
  ]);
  const c = generateCase({ archetype: 'standard', pool: makePool(), rng: makeRng('x') });
  const weights = Object.fromEntries(Object.entries(c.CHANCES).filter(([k]) => k !== 'COLORS'));
  assert.deepEqual(weights, {
    milspec: 7992, restricted: 1598, classified: 320, covert: 64, special: 26,
  });
  assert.deepEqual(c.CHANCES.COLORS, { DEFAULT: 90, PAINTED: 10, LIST: { default: 50, painted: 50 } });
});

test('every bucket holds its count of items of its own grade, with no item twice', () => {
  const pool = makePool();
  const c = generateCase({ archetype: 'standard', pool, rng: makeRng('x') });
  for (const bucket of BUCKETS) {
    const items = bucketOf(c, bucket.key);
    assert.equal(items.length, bucket.count, bucket.key);
    items.forEach((it) => assert.equal(pool.find((p) => p.itemId === it.id).grade, bucket.key));
  }
  assert.equal(new Set(c.ids).size, c.ids.length);
});

test('grades outside the model never reach a case', () => {
  const pool = makePool();
  for (const archetype of Object.keys(TIERS)) {
    const c = generateCase({ archetype, pool, rng: makeRng(archetype) });
    const grades = new Set(c.ITEMS.map((it) => pool.find((p) => p.itemId === it.id).grade));
    assert.ok(!grades.has('consumer') && !grades.has('contraband'), archetype);
  }
});

test('within every grade a dearer tier picks dearer items', () => {
  const pool = makePool();
  const value = (id) => pool.find((p) => p.itemId === id).evValue;
  for (const bucket of BUCKETS) {
    const means = ['budget', 'standard', 'premium', 'elite'].map((archetype) => {
      const values = [];
      for (let seed = 0; seed < 20; seed++) {
        const c = generateCase({ archetype, pool, rng: makeRng(`tier-${archetype}-${seed}`) });
        values.push(...bucketOf(c, bucket.key).map((it) => value(it.id)));
      }
      return values.reduce((a, b) => a + b, 0) / values.length;
    });
    assert.ok(means[0] < means[1] && means[1] < means[2] && means[2] < means[3], `${bucket.key}: ${means}`);
  }
});

test('a tier band of a grade holds the quantiles of that grade, not of the whole pool', () => {
  const pool = makePool();
  const c = generateCase({ archetype: 'budget', pool, rng: makeRng('band') });
  const covertValues = pool.filter((p) => p.grade === 'covert').map((p) => p.evValue).sort((a, b) => a - b);
  const budgetTop = covertValues[Math.round(0.3 * (covertValues.length - 1))];
  bucketOf(c, 'covert').forEach((it) => assert.ok(pool.find((p) => p.itemId === it.id).evValue <= budgetTop));
});

test('a band too thin for its bucket is filled with the grade items nearest its middle', () => {
  const pool = [
    ...[1, 2, 3, 4, 5, 6, 7].map((i) => ({ itemId: i, grade: 'milspec', evValue: i })),
    ...[1, 2, 3, 4, 5].map((i) => ({ itemId: 100 + i, grade: 'restricted', evValue: 10 * i })),
    ...[1, 2, 3, 4].map((i) => ({ itemId: 200 + i, grade: 'classified', evValue: 100 * i })),
    { itemId: 301, grade: 'covert', evValue: 1000 },
    { itemId: 302, grade: 'covert', evValue: 2000 },
    { itemId: 401, grade: 'special', evValue: 5000 },
  ];
  const c = generateCase({ archetype: 'elite', pool, rng: makeRng('thin') });
  assert.equal(c.ITEMS.length, 16);
  assert.deepEqual(bucketOf(c, 'covert').map((it) => it.id).sort((a, b) => a - b), [301, 302]);
  assert.deepEqual(bucketOf(c, 'special').map((it) => it.id), [401]);
  for (const bucket of BUCKETS) {
    bucketOf(c, bucket.key).forEach((it) => assert.equal(pool.find((p) => p.itemId === it.id).grade, bucket.key));
  }
});

test('ev is the probability-weighted value of the items and the price keeps the house edge', () => {
  const pool = makePool();
  const c = generateCase({ archetype: 'standard', pool, rng: makeRng('ev') });
  const total = BUCKETS.reduce((a, b) => a + b.weight, 0);
  let ev = 0;
  for (const it of c.ITEMS) {
    ev += (c.CHANCES[it.rare] / total / bucketOf(c, it.rare).length) * pool.find((p) => p.itemId === it.id).evValue;
  }
  assert.ok(Math.abs(ev - c.ev) < 1e-6, `recomputed ${ev} vs ${c.ev}`);
  assert.equal(c.price, Math.max(1, Math.round(c.ev / HOUSE_RETURN)));
});

test('is deterministic for the same seed', () => {
  const a = generateCase({ archetype: 'standard', pool: makePool(), rng: makeRng('dust2') });
  const b = generateCase({ archetype: 'standard', pool: makePool(), rng: makeRng('dust2') });
  assert.deepEqual(a.ids, b.ids);
  assert.equal(a.price, b.price);
});
