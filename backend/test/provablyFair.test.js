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

test('deriveWinner can pick the sole painted color when the paint roll lands in the painted band', () => {
    const oneColor = {
        id: 'onecolor',
        CHANCES: { FN: 100, COLORS: { DEFAULT: 0, PAINTED: 100, LIST: { red: 100 } } },
        ITEMS: [{ id: 11, rare: 'FN', colors: ['default', 'red'] }],
    };
    const hash = { 11: JSON.stringify({ name: 'y', type: 'pistol', rare: 'FN', pricesInCredits: JSON.stringify({ default: 10, red: 50 }) }) };
    for (let n = 0; n < 50; n++) {
        const w = pf.deriveWinner('s', 'c', n, oneColor, hash);
        assert.strictEqual(w.color, 'red');
    }
});

test('deriveWinner paints a single painted color at ~PAINTED/(DEFAULT+PAINTED)', () => {
    const case9010 = {
        id: 'c9010',
        CHANCES: { FN: 100, COLORS: { DEFAULT: 90, PAINTED: 10, LIST: { red: 100 } } },
        ITEMS: [{ id: 12, rare: 'FN', colors: ['default', 'red'] }],
    };
    const hash = { 12: JSON.stringify({ name: 'z', type: 'pistol', rare: 'FN', pricesInCredits: JSON.stringify({ default: 10, red: 50 }) }) };
    let painted = 0;
    const N = 100000;
    for (let n = 0; n < N; n++) {
        if (pf.deriveWinner('paint-server', 'paint-client', n, case9010, hash).color === 'red') painted++;
    }
    const freq = painted / N;
    assert.ok(Math.abs(freq - 0.10) < 0.01, `painted freq ${freq}, expected ~0.10`);
});

const GOLDEN = require('./fixtures/provablyFair-golden.json');

const goldenMismatches = (derive) => GOLDEN.vectors.filter(([s, c, n, caseId, rarity, itemId, color]) => {
    const w = derive(s, c, n, caseId);
    return w.rarity !== rarity || w.itemId !== itemId || w.color !== color;
});

test('deriveWinner reproduces every frozen golden vector', () => {
    const bad = goldenMismatches((s, c, n, caseId) => pf.deriveWinner(s, c, n, GOLDEN.cases[caseId], GOLDEN.itemHash));
    assert.strictEqual(bad.length, 0, `first mismatch: ${JSON.stringify(bad[0])}`);
});

test('a draw table stored as JSON reproduces every golden vector', () => {
    const tables = {};
    for (const caseId of Object.keys(GOLDEN.cases)) {
        tables[caseId] = JSON.parse(JSON.stringify(pf.buildDrawTable(GOLDEN.cases[caseId], GOLDEN.itemHash)));
    }
    const bad = goldenMismatches((s, c, n, caseId) => pf.deriveFromTable(s, c, n, tables[caseId]));
    assert.strictEqual(bad.length, 0, `first mismatch: ${JSON.stringify(bad[0])}`);
});

test('a stored draw table keeps deciding the same way after the case and prices change', () => {
    const caseDef = JSON.parse(JSON.stringify(GOLDEN.cases.dust2));
    const itemHash = { ...GOLDEN.itemHash };
    const stored = JSON.stringify(pf.buildDrawTable(caseDef, itemHash));
    const vectors = GOLDEN.vectors.filter((v) => v[3] === 'dust2');
    const derive = () => vectors.map(([s, c, n]) => pf.deriveWinner(s, c, n, caseDef, itemHash));
    const before = derive();

    caseDef.ITEMS.reverse();
    caseDef.CHANCES.COLORS.PAINTED = 90;
    for (const id of Object.keys(itemHash)) {
        itemHash[id] = JSON.stringify({ pricesInCredits: JSON.stringify({ default: 1, painted: 0 }) });
    }

    assert.notDeepStrictEqual(derive(), before, 'the change must alter what the current definitions decide');
    const replayed = vectors.map(([s, c, n]) => pf.deriveFromTable(s, c, n, JSON.parse(stored)));
    assert.deepStrictEqual(replayed, before);
});

const sumOf = (odds) => Object.values(odds).reduce((a, b) => a + b, 0);
const closeTo = (actual, expected) => Object.keys(expected).forEach((id) => {
    assert.ok(Math.abs(actual[id] - expected[id]) < 1e-12, `item ${id}: ${actual[id]} vs ${expected[id]}`);
});

test('itemOdds splits each rarity\'s share evenly among its items and adds up to one', () => {
    const odds = pf.itemOdds({
        CHANCES: { FN: 30, MW: 70, COLORS: { DEFAULT: 90, PAINTED: 10, LIST: {} } },
        ITEMS: [{ id: 1, rare: 'FN', colors: ['default'] }, { id: 2, rare: 'MW', colors: ['default'] }, { id: 3, rare: 'MW', colors: ['default'] }],
    });

    assert.deepStrictEqual(Object.keys(odds).sort(), ['1', '2', '3']);
    closeTo(odds, { 1: 0.3, 2: 0.35, 3: 0.35 });
    assert.ok(Math.abs(sumOf(odds) - 1) < 1e-12);
});

test('itemOdds gives an empty rarity\'s share to the most common rarity with items, as the draw does', () => {
    const odds = pf.itemOdds({
        CHANCES: { FN: 30, MW: 50, FT: 20, COLORS: { DEFAULT: 100, PAINTED: 0, LIST: {} } },
        ITEMS: [{ id: 2, rare: 'MW', colors: ['default'] }, { id: 3, rare: 'FT', colors: ['default'] }],
    });

    closeTo(odds, { 2: 0.8, 3: 0.2 });
});

test('itemOdds adds up the chances of an item listed under two rarities', () => {
    const odds = pf.itemOdds({
        CHANCES: { FN: 50, MW: 50, COLORS: { DEFAULT: 100, PAINTED: 0, LIST: {} } },
        ITEMS: [{ id: 1, rare: 'FN', colors: ['default'] }, { id: 1, rare: 'MW', colors: ['default'] }, { id: 2, rare: 'MW', colors: ['default'] }],
    });

    closeTo(odds, { 1: 0.75, 2: 0.25 });
});

test('itemOdds follows the whole-number roll of the draw when weights are not whole numbers', () => {
    const fractional = {
        CHANCES: { FN: 0.6, MW: 0.9, COLORS: { DEFAULT: 100, PAINTED: 0, LIST: {} } },
        ITEMS: [{ id: 1, rare: 'FN', colors: ['default'] }, { id: 2, rare: 'MW', colors: ['default'] }],
    };

    closeTo(pf.itemOdds(fractional), { 1: 0, 2: 1 });
    for (let n = 0; n < 500; n++) {
        assert.strictEqual(pf.deriveWinner('s', 'c', n, fractional, ITEM_HASH).itemId, 2);
    }
});

test('itemOdds matches how often the real draw picks each item of a real case over 100k opens', () => {
    const caseDef = GOLDEN.cases.dust2;
    const odds = pf.itemOdds(caseDef);
    const counts = {};
    const N = 100000;
    for (let n = 0; n < N; n++) {
        const { itemId } = pf.deriveWinner('odds-server', 'odds-client', n, caseDef, GOLDEN.itemHash);
        counts[itemId] = (counts[itemId] || 0) + 1;
    }

    assert.ok(Math.abs(sumOf(odds) - 1) < 1e-9);
    for (const [id, chance] of Object.entries(odds)) {
        const freq = (counts[id] || 0) / N;
        assert.ok(Math.abs(freq - chance) < 0.006, `item ${id}: drew ${freq}, odds ${chance}`);
    }
});

test('itemOdds of a case whose weights are all zero follows the draw to the last rarity', () => {
    const unweighted = {
        CHANCES: { FN: 0, MW: 0, COLORS: { DEFAULT: 100, PAINTED: 0, LIST: {} } },
        ITEMS: [{ id: 1, rare: 'FN', colors: ['default'] }, { id: 2, rare: 'MW', colors: ['default'] }],
    };

    closeTo(pf.itemOdds(unweighted), { 1: 0, 2: 1 });
    assert.strictEqual(pf.deriveWinner('s', 'c', 0, unweighted, ITEM_HASH).itemId, 2);
});
