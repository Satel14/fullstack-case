const ITEMS = require('../../src/constant/itemConfigs');

const G = ITEMS.GRADE;

const BUCKETS = [
    { key: G.MILSPEC, weight: 7992, count: 6 },
    { key: G.RESTRICTED, weight: 1598, count: 4 },
    { key: G.CLASSIFIED, weight: 320, count: 3 },
    { key: G.COVERT, weight: 64, count: 2 },
    { key: G.SPECIAL, weight: 26, count: 1 },
];

const TIERS = {
    budget: [0, 0.3],
    standard: [0.25, 0.75],
    premium: [0.5, 0.9],
    elite: [0.75, 1],
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

const valueBand = (values, [lo, hi]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const at = (q) => sorted[Math.round(q * (sorted.length - 1))];
    return [at(lo), at(hi)];
};

const generateCase = ({ archetype, pool, rng }) => {
    const tier = TIERS[archetype] || TIERS.standard;
    const usedIds = new Set();
    const CHANCES = {
        COLORS: {
            DEFAULT: 90,
            PAINTED: 10,
            LIST: { [ITEMS.COLORS.DEFAULT]: 50, [ITEMS.COLORS.PAINTED]: 50 },
        },
    };
    const OUT = [];

    BUCKETS.forEach((bucket) => {
        CHANCES[bucket.key] = bucket.weight;
        const ofGrade = pool.filter((p) => p.grade === bucket.key);
        const band = valueBand(ofGrade.map((p) => p.evValue), tier);
        const available = ofGrade.filter((p) => !usedIds.has(p.itemId));
        let candidates = available.filter((p) => inBand(p.evValue, band));
        if (candidates.length < bucket.count) {
            const center = (band[0] + band[1]) / 2;
            const windowSize = bucket.count * 3;
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
    generateCase, makeRng, pickN, BUCKETS, TIERS, HOUSE_RETURN,
};
