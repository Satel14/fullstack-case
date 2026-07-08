const ITEMS = require('../../src/constant/itemConfigs');

const R = ITEMS.RARITY;

const BUCKETS = [
    { key: R.FACTORY_NEW, weight: 55, count: 6 },
    { key: R.MINIMAL_WEAR, weight: 28, count: 4 },
    { key: R.FIELD_TESTED, weight: 12, count: 3 },
    { key: R.WELL_WORN, weight: 4, count: 2 },
    { key: R.BATTLE_SCARRED, weight: 1, count: 1 },
];

const ARCHETYPES = {
    budget: [[1, 30], [20, 80], [60, 300], [200, 1500], [800, 2500]],
    standard: [[10, 100], [80, 400], [300, 1500], [1000, 6000], [3000, 15000]],
    premium: [[50, 400], [300, 1200], [1000, 5000], [4000, 20000], [15000, 60000]],
    elite: [[200, 1500], [1000, 5000], [4000, 20000], [15000, 70000], [60000, 250000]],
};

const HOUSE_RETURN = 0.85;

const makeRng = (seedStr) => {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    let s = h >>> 0;
    return () => {
        s ^= s << 13; s >>>= 0;
        s ^= s >> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
    };
};

const pickN = (candidates, count, rng, usedIds) => {
    const local = candidates.filter((c) => !usedIds.has(c.itemId));
    const chosen = [];
    while (chosen.length < count && local.length) {
        const [item] = local.splice(Math.floor(rng() * local.length), 1);
        chosen.push(item);
        usedIds.add(item.itemId);
    }
    return chosen;
};

const inBand = (v, [lo, hi]) => v >= lo && v <= hi;

const generateCase = ({ archetype, pool, rng }) => {
    const bands = ARCHETYPES[archetype] || ARCHETYPES.standard;
    const usedIds = new Set();
    const CHANCES = {
        COLORS: {
            DEFAULT: 90,
            PAINTED: 10,
            LIST: { [ITEMS.COLORS.DEFAULT]: 50, [ITEMS.COLORS.PAINTED]: 50 },
        },
    };
    const OUT = [];

    BUCKETS.forEach((bucket, bi) => {
        CHANCES[bucket.key] = bucket.weight;
        const band = bands[bi];
        const wantKnife = bi === BUCKETS.length - 1;
        const available = pool.filter(
            (p) => (wantKnife ? p.isKnife : !p.isKnife) && !usedIds.has(p.itemId),
        );
        let candidates = available.filter((p) => inBand(p.evValue, band));
        if (candidates.length < bucket.count) {
            const center = (band[0] + band[1]) / 2;
            const windowSize = Math.max(bucket.count * 3, bucket.count);
            candidates = available
                .slice()
                .sort((a, b) => Math.abs(a.evValue - center) - Math.abs(b.evValue - center))
                .slice(0, windowSize);
        }
        pickN(candidates, bucket.count, rng, usedIds).forEach((c) => {
            OUT.push({ id: c.itemId, rare: bucket.key, colors: [ITEMS.COLORS.DEFAULT, ITEMS.COLORS.PAINTED] });
        });
    });

    const totalWeight = BUCKETS.reduce((a, b) => a + b.weight, 0);
    let ev = 0;
    BUCKETS.forEach((bucket) => {
        const inBucket = OUT.filter((it) => it.rare === bucket.key);
        if (!inBucket.length) return;
        const pPer = bucket.weight / totalWeight / inBucket.length;
        inBucket.forEach((it) => {
            const p = pool.find((x) => x.itemId === it.id);
            ev += pPer * p.evValue;
        });
    });

    const price = Math.max(1, Math.round(ev / HOUSE_RETURN));
    return { CHANCES, ITEMS: OUT, ids: OUT.map((i) => i.id), ev, price };
};

module.exports = {
    generateCase, makeRng, pickN, BUCKETS, ARCHETYPES, HOUSE_RETURN,
};
