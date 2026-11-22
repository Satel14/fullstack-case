const { HOUSE_RETURN } = require('./caseGen');

const TOTAL_WEIGHT = 10000000;

const relativeWeights = (values, alpha) => {
    const cheapest = Math.min(...values);
    return values.map((value) => (value / cheapest) ** -alpha);
};

const expectedValue = (values, weights) => {
    let weighted = 0;
    let total = 0;
    values.forEach((value, i) => {
        weighted += weights[i] * value;
        total += weights[i];
    });
    return weighted / total;
};

const solveExponent = (values, goal, label) => {
    const cheapest = Math.min(...values);
    const average = expectedValue(values, values.map(() => 1));
    if (!(goal > cheapest)) {
        throw new Error(`${label}: the goal ${goal.toFixed(2)} is not above the cheapest item (${cheapest.toFixed(2)})`);
    }
    if (goal > average) {
        throw new Error(`${label}: the goal ${goal.toFixed(2)} is above the plain average (${average.toFixed(2)})`);
    }
    let low = 0;
    let high = 64;
    for (let step = 0; step < 200; step += 1) {
        const mid = (low + high) / 2;
        if (expectedValue(values, relativeWeights(values, mid)) > goal) low = mid;
        else high = mid;
    }
    return (low + high) / 2;
};

const integerWeights = (shares, total = TOTAL_WEIGHT) => {
    const raw = shares.map((share) => share * total);
    const weights = raw.map((r) => Math.max(1, Math.floor(r)));
    let missing = total - weights.reduce((a, b) => a + b, 0);
    const byRemainder = raw
        .map((r, i) => [r - Math.floor(r), i])
        .sort((a, b) => b[0] - a[0] || a[1] - b[1])
        .map(([, i]) => i);
    for (let k = 0; missing > 0; k = (k + 1) % byRemainder.length) {
        weights[byRemainder[k]] += 1;
        missing -= 1;
    }
    const byWeight = weights
        .map((w, i) => [w, i])
        .sort((a, b) => b[0] - a[0] || a[1] - b[1])
        .map(([, i]) => i);
    for (let k = 0; missing < 0; k = (k + 1) % byWeight.length) {
        if (weights[byWeight[k]] > 1) {
            weights[byWeight[k]] -= 1;
            missing += 1;
        }
    }
    return weights;
};

const valueWeights = (values, target, label, total = TOTAL_WEIGHT) => {
    const alpha = solveExponent(values, HOUSE_RETURN * target, label);
    const raw = relativeWeights(values, alpha);
    const sum = raw.reduce((a, b) => a + b, 0);
    return { alpha, weights: integerWeights(raw.map((r) => r / sum), total) };
};

const realisedReturn = (values, weights, price) => expectedValue(values, weights) / price;

module.exports = {
    TOTAL_WEIGHT, relativeWeights, expectedValue, solveExponent, integerWeights, valueWeights, realisedReturn,
};
