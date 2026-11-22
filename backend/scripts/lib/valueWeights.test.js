const test = require('node:test');
const assert = require('node:assert/strict');
const {
    TOTAL_WEIGHT, relativeWeights, solveExponent, integerWeights, valueWeights, expectedValue, realisedReturn,
} = require('./valueWeights');

const sum = (list) => list.reduce((a, b) => a + b, 0);

test('relative weights give the cheapest item one and fall with value', () => {
    assert.deepEqual(relativeWeights([4, 1, 2], 0), [1, 1, 1]);
    assert.deepEqual(relativeWeights([4, 1, 2], 2), [0.0625, 1, 0.25]);
});

test('relative weights remain finite for small prices and a large exponent', () => {
    const weights = relativeWeights([0.000001, 1, 1e100], 64);
    assert.equal(weights[0], 1);
    assert.ok(weights.every((weight) => Number.isFinite(weight) && weight >= 0 && weight <= 1));
});

test('expected value and realised return account for the sum of the weights', () => {
    assert.equal(expectedValue([2, 10], [3, 1]), 4);
    assert.equal(expectedValue([2, 10], [30, 10]), 4);
    assert.equal(realisedReturn([2, 10], [3, 1], 5), 0.8);
});

test('the solved exponent brings the expected value down to the goal', () => {
    const values = [2, 5, 40, 300, 20000];
    const alpha = solveExponent(values, 10, 'demo');
    const weights = values.map((value) => (value / 2) ** -alpha);
    assert.ok(alpha >= 0 && alpha <= 64);
    assert.ok(Math.abs(expectedValue(values, weights) - 10) < 1e-6);
});

test('a goal at or below the cheapest item and a goal above the plain average are refused, naming the case', () => {
    assert.throws(() => solveExponent([3, 9], 3, 'aug'), /aug: .*is not above the cheapest item/);
    assert.throws(() => solveExponent([3, 9], 2, 'aug'), /aug: .*is not above the cheapest item/);
    assert.throws(() => solveExponent([3, 9], 7, 'aug'), /aug: .*is above the plain average/);
});

test('the plain average is reachable with an exponent near zero', () => {
    const alpha = solveExponent([3, 9], 6, 'average');
    assert.ok(Math.abs(alpha) < 1e-12);
    assert.ok(Math.abs(expectedValue([3, 9], relativeWeights([3, 9], alpha)) - 6) < 1e-12);
});

test('a lower goal requires a larger exponent', () => {
    const values = [2, 5, 40, 300, 20000];
    const exponents = [5, 10, 100].map((goal) => solveExponent(values, goal, 'monotone'));
    assert.ok(exponents[0] > exponents[1] && exponents[1] > exponents[2]);
});

test('integer weights add up to the total, none is zero, and they follow the shares', () => {
    const weights = integerWeights([0.5, 0.3, 0.2 - 1e-9, 1e-9]);
    assert.equal(TOTAL_WEIGHT, 10000000);
    assert.equal(sum(weights), TOTAL_WEIGHT);
    assert.ok(weights.every((weight) => Number.isInteger(weight) && weight >= 1));
    assert.deepEqual(weights.slice(0, 2), [5000000, 3000000]);
});

test('integer weights allocate the largest remainders first and break ties by index', () => {
    assert.deepEqual(integerWeights([0.43, 0.34, 0.23], 10), [4, 4, 2]);
    assert.deepEqual(integerWeights([1 / 3, 1 / 3, 1 / 3], 10), [4, 3, 3]);
});

test('minimum weights are taken from larger weights when rounding exceeds the total', () => {
    assert.deepEqual(integerWeights([1 - 3e-9, 1e-9, 1e-9, 1e-9], 10), [7, 1, 1, 1]);
    assert.deepEqual(integerWeights([0.5, 0.5, 0, 0], 10), [4, 4, 1, 1]);
    assert.deepEqual(integerWeights([0.9, 0.05, 0.05], 3), [1, 1, 1]);
});

test('value weights of a case return 85 % of its price within half a percent', () => {
    const values = Object.freeze([4, 6, 15, 90, 700, 35000]);
    for (const total of [TOTAL_WEIGHT, 1000000]) {
        const { alpha, weights } = valueWeights(values, 58, 'desert-eagle', total);
        assert.ok(alpha > 0);
        assert.equal(sum(weights), total);
        assert.ok(weights.every((weight) => Number.isInteger(weight) && weight >= 1));
        const back = realisedReturn(values, weights, 58);
        assert.ok(back >= 0.845 && back <= 0.855, `return ${back}`);
        assert.ok(weights.every((weight, i) => i === 0 || weight <= weights[i - 1]));
        assert.ok(weights[0] > weights[5]);
    }
});
