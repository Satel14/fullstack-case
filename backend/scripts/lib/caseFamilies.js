const { GRADE } = require('../../src/constant/itemConfigs');
const { HOUSE_RETURN } = require('./caseGen');
const { evenlyByValue, valueBand } = require('./itemPool');
const {
    TOTAL_WEIGHT, valueWeights, integerWeights, relativeWeights, expectedValue, solveExponent, realisedReturn,
} = require('./valueWeights');

const byValue = (a, b) => a.value - b.value || a.itemId - b.itemId;
const mean = (values) => expectedValue(values, values.map(() => 1));
const bucketOf = ({ itemId }) => `item-${itemId}`;

const requireItems = (items, label, description = 'selected') => {
    if (items.length === 0) throw new Error(`${label}: no items in the ${description} pool`);
};

const weightedCase = (id, items, weights, price) => {
    const values = items.map(({ value }) => value);
    const back = realisedReturn(values, weights, price);
    if (!(back >= 0.84 && back <= 0.86)) {
        throw new Error(`${id}: realised return ${back} is outside [0.84, 0.86]`);
    }
    return {
        id,
        price,
        CHANCES: Object.fromEntries(items.map((item, i) => [bucketOf(item), weights[i]])),
        ITEMS: items.map((item) => ({ id: item.itemId, rare: bucketOf(item) })),
        values,
    };
};

const targetCase = (selected, entry) => {
    requireItems(selected, entry.id);
    const items = [...selected].sort(byValue);
    const { weights } = valueWeights(items.map(({ value }) => value), entry.target, entry.id);
    return weightedCase(entry.id, items, weights, entry.target);
};

const weaponCase = (pool, entry) => targetCase(
    pool.filter(({ weapon, grade }) => weapon === entry.title && grade !== GRADE.SPECIAL), entry,
);

const gradeCase = (pool, entry) => targetCase(
    evenlyByValue(pool.filter(({ grade }) => grade === entry.grade), 40), entry,
);

const knifeCase = (pool, entry) => {
    const items = pool.filter(({ weapon, grade }) => weapon === entry.title && grade === GRADE.SPECIAL).sort(byValue);
    requireItems(items, entry.id);
    const values = items.map(({ value }) => value);
    return {
        id: entry.id,
        price: Math.round(mean(values) / HOUSE_RETURN),
        CHANCES: { [GRADE.SPECIAL]: 1 },
        ITEMS: items.map(({ itemId }) => ({ id: itemId, rare: GRADE.SPECIAL })),
        values,
    };
};

const knifeChanceCases = (pool, entries) => {
    const anchors = entries.filter(({ target }) => target !== undefined);
    if (anchors.length !== 1) throw new Error('knife-chance: exactly one case must have a target price');
    const [anchor] = anchors;
    const knives = evenlyByValue(valueBand(pool.filter(({ grade }) => grade === GRADE.SPECIAL), 0.7, 1), 15);
    const fillers = evenlyByValue(valueBand(pool.filter(({ grade }) => grade === GRADE.RESTRICTED), 0.1, 0.4), 6);
    requireItems(knives, anchor.id, GRADE.SPECIAL);
    requireItems(fillers, anchor.id, GRADE.RESTRICTED);
    const knifeValues = knives.map(({ value }) => value);
    const fillerAverage = mean(fillers.map(({ value }) => value));
    const knifeGoal = (HOUSE_RETURN * anchor.target - (1 - anchor.share) * fillerAverage) / anchor.share;
    const alpha = solveExponent(knifeValues, knifeGoal, anchor.id);
    const raw = relativeWeights(knifeValues, alpha);
    const total = raw.reduce((a, b) => a + b, 0);
    const shares = raw.map((weight) => weight / total);

    return entries.map((entry) => {
        const knifeTotal = Math.round(entry.share * TOTAL_WEIGHT);
        const knifeWeights = integerWeights(shares, knifeTotal);
        const fillerWeights = integerWeights(fillers.map(() => 1 / fillers.length), TOTAL_WEIGHT - knifeTotal);
        const items = [
            ...knives.map((item, i) => ({ ...item, weight: knifeWeights[i] })),
            ...fillers.map((item, i) => ({ ...item, weight: fillerWeights[i] })),
        ].sort(byValue);
        const weights = items.map(({ weight }) => weight);
        const values = items.map(({ value }) => value);
        const price = entry === anchor ? anchor.target : Math.round(expectedValue(values, weights) / HOUSE_RETURN);
        return weightedCase(entry.id, items, weights, price);
    });
};

module.exports = { weaponCase, gradeCase, knifeCase, knifeChanceCases };
