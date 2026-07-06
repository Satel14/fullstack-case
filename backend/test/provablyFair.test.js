const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const pf = require('../src/modules/provablyFair');
const ITEM_CONFIG = require('../src/constant/itemConfigs');

// --- fixtures ---------------------------------------------------------------
// A case with 5 rarities, weights summing to 100, one single-color item each,
// so the color path is trivial and rarity distribution is isolated.
const RARE = ['FN', 'MW', 'FT', 'WW', 'BS'];
const CASE_DEF = {
    id: 'testcase',
    CHANCES: {
        FN: 30, MW: 30, FT: 20, WW: 15, BS: 5,
        COLORS: { DEFAULT: 90, PAINTED: 10, LIST: { red: 100 } },
    },
    ITEMS: [
        { id: 1, rare: 'FN', colors: ['default'] },
        { id: 2, rare: 'MW', colors: ['default'] },
        { id: 3, rare: 'FT', colors: ['default'] },
        { id: 4, rare: 'WW', colors: ['default'] },
        { id: 5, rare: 'BS', colors: ['default'] },
    ],
};
const ITEM_HASH = {
    1: JSON.stringify({ name: 'a', type: 'rifle', rare: 'FN', pricesInCredits: JSON.stringify({ default: 10 }) }),
    2: JSON.stringify({ name: 'b', type: 'rifle', rare: 'MW', pricesInCredits: JSON.stringify({ default: 10 }) }),
    3: JSON.stringify({ name: 'c', type: 'rifle', rare: 'FT', pricesInCredits: JSON.stringify({ default: 10 }) }),
    4: JSON.stringify({ name: 'd', type: 'rifle', rare: 'WW', pricesInCredits: JSON.stringify({ default: 10 }) }),
    5: JSON.stringify({ name: 'e', type: 'rifle', rare: 'BS', pricesInCredits: JSON.stringify({ default: 10 }) }),
};

test('sha256 matches node crypto', () => {
    assert.strictEqual(pf.sha256('hello'), crypto.createHash('sha256').update('hello').digest('hex'));
});

test('hmacDigest is 64 hex chars and matches node crypto', () => {
    const d = pf.hmacDigest('server', 'client', 0);
    assert.match(d, /^[0-9a-f]{64}$/);
    assert.strictEqual(d, crypto.createHmac('sha256', 'server').update('client:0').digest('hex'));
});

test('floatsFromDigest returns floats in [0,1)', () => {
    const floats = pf.floatsFromDigest('ffffffff00000000ffffffff00000000ffffffff00000000ffffffff00000000', 4);
    assert.strictEqual(floats.length, 4);
    for (const f of floats) { assert.ok(f >= 0 && f < 1, `float out of range: ${f}`); }
    assert.ok(floats[0] > 0.999);   // ffffffff / 2^32
    assert.strictEqual(floats[1], 0); // 00000000 / 2^32
});

test('deriveWinner is deterministic', () => {
    const a = pf.deriveWinner('server', 'client', 7, CASE_DEF, ITEM_HASH);
    const b = pf.deriveWinner('server', 'client', 7, CASE_DEF, ITEM_HASH);
    assert.deepStrictEqual(a, b);
    assert.ok(RARE.includes(a.rarity));
    assert.ok(CASE_DEF.ITEMS.some((i) => i.id === a.itemId));
});

test('deriveWinner rarity distribution within ~1.5% of CHANCES over 100k runs', () => {
    const counts = { FN: 0, MW: 0, FT: 0, WW: 0, BS: 0 };
    const N = 100000;
    for (let n = 0; n < N; n++) {
        const w = pf.deriveWinner('dist-server', 'dist-client', n, CASE_DEF, ITEM_HASH);
        counts[w.rarity]++;
    }
    const expected = { FN: 0.30, MW: 0.30, FT: 0.20, WW: 0.15, BS: 0.05 };
    for (const r of RARE) {
        const freq = counts[r] / N;
        assert.ok(Math.abs(freq - expected[r]) < 0.015, `${r}: got ${freq}, expected ${expected[r]}`);
    }
});

test('deriveWinner falls back to most common rarity with items when rolled rarity is empty', () => {
    const sparse = {
        id: 'sparse',
        CHANCES: { FN: 30, MW: 70, COLORS: { DEFAULT: 100, PAINTED: 0, LIST: {} } },
        ITEMS: [{ id: 2, rare: 'MW', colors: ['default'] }], // no FN items
    };
    for (let n = 0; n < 200; n++) {
        const w = pf.deriveWinner('s', 'c', n, sparse, ITEM_HASH);
        assert.strictEqual(w.rarity, 'MW');
        assert.strictEqual(w.itemId, 2);
    }
});

test('deriveWinner picks a painted color when the paint roll lands in the painted band', () => {
    const painted = {
        id: 'painted',
        CHANCES: { FN: 100, COLORS: { DEFAULT: 0, PAINTED: 100, LIST: { red: 100, blue: 100 } } },
        ITEMS: [{ id: 9, rare: 'FN', colors: ['default', 'red', 'blue'] }],
    };
    const hash = { 9: JSON.stringify({ name: 'x', type: 'knife', rare: 'FN', pricesInCredits: JSON.stringify({ default: 10, red: 50, blue: 50 }) }) };
    const w = pf.deriveWinner('s', 'c', 1, painted, hash);
    assert.notStrictEqual(w.color, ITEM_CONFIG.COLORS.DEFAULT); // DEFAULT weight 0 -> always painted
    assert.ok(['red', 'blue'].includes(w.color));
});

test('single-color item returns its only color', () => {
    const w = pf.deriveWinner('server', 'client', 3, CASE_DEF, ITEM_HASH);
    assert.strictEqual(w.color, ITEM_CONFIG.COLORS.DEFAULT);
});
