const test = require('node:test');
const assert = require('node:assert/strict');
const pf = require('../src/modules/provablyFair');
const caseDef = require('../src/constant/cases/_all')['desert-eagle'];
const priceMap = require('../scripts/data/priceMap.json');

const itemHash = Object.fromEntries(caseDef.ITEMS.map(({ id }) => [id, JSON.stringify({
    pricesInCredits: JSON.stringify({ default: priceMap[id].default, painted: priceMap[id].painted }),
})]));

const drawFrequencies = (caseDef, itemHash, opens) => {
    const counts = {};
    for (let n = 0; n < opens; n++) {
        const { itemId } = pf.deriveWinner('odds-server', 'odds-client', n, caseDef, itemHash);
        counts[itemId] = (counts[itemId] || 0) + 1;
    }
    return counts;
};

const assertDrawnLikeOdds = (odds, counts, opens) => {
    for (const [id, chance] of Object.entries(odds)) {
        const freq = (counts[id] || 0) / opens;
        const allowed = 5 * Math.sqrt((chance * (1 - chance)) / opens) + 1e-12;
        assert.ok(Math.abs(freq - chance) <= allowed, `item ${id}: drew ${freq}, odds ${chance}, allowed ${allowed}`);
    }
};

test('itemOdds matches every Desert Eagle item weight out of 10000000', () => {
    const odds = pf.itemOdds(caseDef);
    assert.deepEqual(Object.keys(odds).sort(), caseDef.ITEMS.map(({ id }) => String(id)).sort());
    for (const { id, rare } of caseDef.ITEMS) {
        const expected = caseDef.CHANCES[rare] / 10000000;
        assert.ok(Math.abs(odds[id] - expected) < 1e-12, `item ${id}: ${odds[id]} vs ${expected}`);
    }
    assert.ok(Math.abs(Object.values(odds).reduce((sum, chance) => sum + chance, 0) - 1) < 1e-12);
});

test('100000 Desert Eagle opens follow every item\'s odds within five standard deviations', () => {
    const opens = 100000;
    const odds = pf.itemOdds(caseDef);
    const counts = drawFrequencies(caseDef, itemHash, opens);
    assert.ok(Object.keys(counts).every((id) => Object.hasOwn(odds, id)));
    assertDrawnLikeOdds(odds, counts, opens);
});

test('a value-weighted draw table round-trips through JSON and reproduces 200 opens', () => {
    const table = pf.buildDrawTable(caseDef, itemHash);
    const restored = JSON.parse(JSON.stringify(table));
    assert.deepEqual(restored, table);
    for (let n = 0; n < 200; n++) {
        assert.deepEqual(
            pf.deriveFromTable('odds-server', 'odds-client', n, restored),
            pf.deriveWinner('odds-server', 'odds-client', n, caseDef, itemHash),
            `nonce ${n}`,
        );
    }
});
