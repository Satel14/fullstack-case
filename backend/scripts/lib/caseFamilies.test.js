const test = require('node:test');
const assert = require('node:assert/strict');
const { itemPool } = require('./itemPool');
const { TOTAL_WEIGHT, expectedValue, realisedReturn } = require('./valueWeights');
const { HOUSE_RETURN } = require('./caseGen');
const { weaponCase, gradeCase, knifeCase, knifeChanceCases } = require('./caseFamilies');

const poolOf = (rows) => {
    const manifest = {};
    const priceMap = {};
    const gradeMap = {};
    rows.forEach(([itemId, weapon, grade, value, category = 'Rifles']) => {
        manifest[`${category}/${weapon}/skin-${itemId}.webp`] = itemId;
        priceMap[itemId] = { default: value, painted: value };
        gradeMap[itemId] = grade;
    });
    return Object.freeze(itemPool({ manifest, priceMap, gradeMap }).map(Object.freeze));
};

const weightsOf = (built) => built.ITEMS.map(({ rare }) => built.CHANCES[rare]);
const sum = (values) => values.reduce((a, b) => a + b, 0);
const idsOf = (built) => built.ITEMS.map(({ id }) => id);

const assertWeightedCase = (built, pool) => {
    const byId = new Map(pool.map((item) => [item.itemId, item]));
    const ids = idsOf(built);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(ids, [...ids].sort((a, b) => byId.get(a).value - byId.get(b).value || a - b));
    assert.deepEqual(built.values, ids.map((id) => byId.get(id).value));
    assert.deepEqual(built.ITEMS, ids.map((id) => ({ id, rare: `item-${id}` })));
    assert.deepEqual(Object.keys(built.CHANCES), ids.map((id) => `item-${id}`));
    const weights = weightsOf(built);
    assert.equal(sum(weights), TOTAL_WEIGHT);
    assert.ok(weights.every((weight) => Number.isInteger(weight) && weight >= 1));
    const back = realisedReturn(built.values, weights, built.price);
    assert.ok(back >= 0.84 && back <= 0.86, `${built.id}: return ${back}`);
};

test('weapon cases hold all six skins of their weapon, including low grades and contraband, and no knife', () => {
    const grades = ['consumer', 'industrial', 'milspec', 'restricted', 'classified', 'contraband'];
    const pool = poolOf([
        ...[4, 6, 15, 90, 700, 35000].map((value, i) => [i + 1, 'Desert Eagle', grades[i], value, 'Pistols']),
        [7, 'Karambit', 'special', 60000, 'Other'],
        [8, 'AWP', 'milspec', 1],
        [9, 'Desert Eagle', 'special', 10000, 'Other'],
    ]);
    const entry = Object.freeze({ id: 'desert-eagle', title: 'Desert Eagle', target: 58 });
    const built = weaponCase(pool, entry);
    assert.equal(built.id, entry.id);
    assert.equal(built.price, entry.target);
    assert.deepEqual(idsOf(built), [1, 2, 3, 4, 5, 6]);
    assertWeightedCase(built, pool);
    assert.ok(weightsOf(built).every((weight, i, weights) => i === 0 || weight <= weights[i - 1]));
    assert.deepEqual(weaponCase(Object.freeze([...pool].reverse()), entry), built);
});

test('grade cases sample 40 items of one grade including its cheapest and most expensive items', () => {
    const pool = poolOf([
        ...Array.from({ length: 60 }, (_, i) => [i + 1, 'AK-47', 'milspec', i + 1]),
        [100, 'AWP', 'restricted', 0.1], [101, 'Karambit', 'special', 10000, 'Other'],
    ]);
    const built = gradeCase(pool, { id: 'grade-milspec', grade: 'milspec', target: 20 });
    assert.equal(built.id, 'grade-milspec');
    assert.equal(built.price, 20);
    assert.equal(built.ITEMS.length, 40);
    assert.equal(built.ITEMS[0].id, 1);
    assert.equal(built.ITEMS.at(-1).id, 60);
    assert.ok(idsOf(built).every((id) => id <= 60));
    assertWeightedCase(built, pool);
});

test('grade cases keep every item when the grade contains fewer than 40 skins', () => {
    const pool = poolOf([
        [1, 'AK-47', 'restricted', 4], [2, 'AWP', 'restricted', 60],
        [3, 'M4A4', 'restricted', 400], [4, 'AK-47', 'covert', 1],
    ]);
    const built = gradeCase(pool, { id: 'grade-restricted', grade: 'restricted', target: 58 });
    assert.deepEqual(idsOf(built), [1, 2, 3]);
    assertWeightedCase(built, pool);
});

test('knife cases give every special skin of one knife equal odds and price its mean value', () => {
    const pool = poolOf([
        [30, 'Karambit', 'special', 1000, 'Other'], [10, 'Karambit', 'special', 1000, 'Other'],
        [20, 'Karambit', 'special', 2200, 'Other'], [40, 'Bayonet', 'special', 3000, 'Other'],
        [50, 'Karambit', 'covert', 1, 'Other'], [60, 'Zeus x27', 'covert', 3000, 'Other'],
    ]);
    const built = knifeCase(pool, { id: 'karambit', title: 'Karambit' });
    assert.deepEqual(built, {
        id: 'karambit', price: Math.round(1400 / HOUSE_RETURN), CHANCES: { special: 1 },
        ITEMS: [{ id: 10, rare: 'special' }, { id: 30, rare: 'special' }, { id: 20, rare: 'special' }],
        values: [1000, 1000, 2200],
    });
});

const chanceEntries = Object.freeze([
    Object.freeze({ id: 'knife-1', share: 0.01 }),
    Object.freeze({ id: 'knife-3', share: 0.03, target: 1294 }),
    Object.freeze({ id: 'knife-5', share: 0.05 }),
]);

const chancePool = () => poolOf([
    ...Array.from({ length: 100 }, (_, i) => [1000 + i, 'Karambit', 'special', 500 + 450 * i, 'Other']),
    ...Array.from({ length: 100 }, (_, i) => [2000 + i, 'AK-47', 'restricted', 10 + i]),
    ...Array.from({ length: 20 }, (_, i) => [3000 + i, 'Zeus x27', 'covert', 1000000 + i, 'Other']),
    [4000, 'AWP', 'consumer', 1],
]);

test('knife-chance cases share 15 special knives and six restricted fillers with exact total knife shares', () => {
    const pool = chancePool();
    const built = knifeChanceCases(pool, chanceEntries);
    const expectedKnives = [1069, 1071, 1073, 1075, 1078, 1080, 1082, 1084, 1086, 1088, 1090, 1093, 1095, 1097, 1099];
    const expectedFillers = [2010, 2016, 2022, 2028, 2034, 2040];
    assert.deepEqual(built.map(({ id }) => id), ['knife-1', 'knife-3', 'knife-5']);
    built.forEach((result, i) => {
        assertWeightedCase(result, pool);
        assert.deepEqual(idsOf(result), [...expectedFillers, ...expectedKnives]);
        const knifeWeights = expectedKnives.map((id) => result.CHANCES[`item-${id}`]);
        const fillerWeights = expectedFillers.map((id) => result.CHANCES[`item-${id}`]);
        assert.equal(sum(knifeWeights), chanceEntries[i].share * TOTAL_WEIGHT);
        assert.equal(sum(fillerWeights), (1 - chanceEntries[i].share) * TOTAL_WEIGHT);
        assert.ok(Math.max(...fillerWeights) - Math.min(...fillerWeights) <= 1);
        assert.ok(knifeWeights[0] > knifeWeights.at(-1));
        if (chanceEntries[i].target === undefined) {
            assert.equal(result.price, Math.round(expectedValue(result.values, weightsOf(result)) / HOUSE_RETURN));
        }
    });
    assert.equal(built[1].price, 1294);
    assert.ok(built[0].price < built[1].price && built[1].price < built[2].price);
});

test('knife-chance cases reuse the anchor distribution regardless of pool or entry order', () => {
    const pool = chancePool();
    const built = knifeChanceCases(pool, chanceEntries);
    const anchor = built[1];
    for (const result of [built[0], built[2]]) {
        const share = chanceEntries.find(({ id }) => id === result.id).share;
        const total = share * TOTAL_WEIGHT;
        const anchorTotal = 0.03 * TOTAL_WEIGHT;
        for (const { id } of anchor.ITEMS.filter(({ id }) => id < 2000)) {
            const difference = Math.abs(result.CHANCES[`item-${id}`] / total - anchor.CHANCES[`item-${id}`] / anchorTotal);
            assert.ok(difference <= 1 / total + 1 / anchorTotal, `${result.id}: item ${id}`);
        }
    }
    assert.deepEqual(
        knifeChanceCases(Object.freeze([...pool].reverse()), [chanceEntries[1], chanceEntries[2], chanceEntries[0]]),
        [built[1], built[2], built[0]],
    );
});

test('unreachable target prices are refused with the case id', () => {
    const pool = poolOf([[1, 'AK-47', 'milspec', 3], [2, 'AK-47', 'milspec', 9]]);
    assert.throws(() => weaponCase(pool, { id: 'ak-47', title: 'AK-47', target: 3 }), /ak-47: .*cheapest/);
    assert.throws(() => gradeCase(pool, { id: 'grade-milspec', grade: 'milspec', target: 10 }), /grade-milspec: .*average/);
    assert.throws(() => knifeChanceCases(chancePool(), [{ id: 'knife-3', share: 0.03, target: 1 }]), /knife-3: .*cheapest/);
});

test('integer rounding that pushes realised return outside the approved band is refused with the case id', () => {
    const pool = poolOf([[1, 'AWP', 'covert', 1], [2, 'AWP', 'covert', 1e9]]);
    assert.throws(() => weaponCase(pool, { id: 'awp', title: 'AWP', target: 10 }), /awp: .*return.*0\.84.*0\.86/);
});

test('empty family selections are refused before allocating weights', () => {
    assert.throws(() => weaponCase([], { id: 'ak-47', title: 'AK-47', target: 125 }), /ak-47: .*no items/);
    assert.throws(() => gradeCase([], { id: 'grade-milspec', grade: 'milspec', target: 13 }), /grade-milspec: .*no items/);
    assert.throws(() => knifeCase([], { id: 'karambit', title: 'Karambit' }), /karambit: .*no items/);
    const pool = chancePool();
    assert.throws(() => knifeChanceCases(pool.filter(({ grade }) => grade !== 'special'), chanceEntries), /knife-3: .*special/);
    assert.throws(() => knifeChanceCases(pool.filter(({ grade }) => grade !== 'restricted'), chanceEntries), /knife-3: .*restricted/);
});

test('knife-chance entries must identify a single target-price anchor', () => {
    assert.throws(() => knifeChanceCases(chancePool(), [{ id: 'knife-1', share: 0.01 }]), /knife-chance: .*one.*target/);
    assert.throws(() => knifeChanceCases(chancePool(), [
        { id: 'knife-1', share: 0.01, target: 500 }, { id: 'knife-3', share: 0.03, target: 1294 },
    ]), /knife-chance: .*one.*target/);
});
