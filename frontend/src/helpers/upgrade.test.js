import {
    ROLL_SCALE,
    MIN_THRESHOLD,
    MAX_THRESHOLD,
    MAX_STAKE_ITEMS,
    MULTIPLIERS,
    toKop,
    upgradeThreshold,
    thresholdAllowed,
    chancePercent,
    targetPriceRange,
    multiplierRange,
    rollAngle,
} from './upgrade';

test('upgrade constants match the approved rules', () => {
    expect(ROLL_SCALE).toBe(1000000);
    expect(MIN_THRESHOLD).toBe(10000);
    expect(MAX_THRESHOLD).toBe(750000);
    expect(MAX_STAKE_ITEMS).toBe(6);
    expect(MULTIPLIERS).toEqual([1.5, 2, 3, 5, 10, 20]);
});

test.each([
    ['12.5', 1250],
    ['12.34', 1234],
    [0.1 + 0.2, 30],
    [0.3 - 0.1, 20],
    [0.29, 29],
    ['1.005', 101],
    ['9.999', 1000],
    ['0.0049', 0],
    ['1.25e2', 12500],
    [1e-7, 0],
    ['9999999999.99', 999999999999],
    [0, 0],
])('%p credits converts to %i kopiyky without floating-point multiplication', (price, kopiyky) => {
    expect(toKop(price)).toBe(kopiyky);
});

test('unusable prices cannot contribute to a stake', () => {
    [undefined, null, '', 'invalid', -1, '-0.01', NaN, Infinity, true, [], {}, '90071992547409.92']
        .forEach((price) => expect(toKop(price)).toBe(0));
});

test.each([
    [10000, 20000, 450000],
    [1, 3, 300000],
    [100, 120, 750000],
    [1, 90, 10000],
    [1, 91, 9890],
    [449999224999, 900000449999, 449998],
])('a stake of %i and target of %i kopiyky have threshold %i', (stakeKop, targetKop, threshold) => {
    expect(upgradeThreshold(stakeKop, targetKop)).toBe(threshold);
});

test('empty or unusable stakes and targets have no chance', () => {
    [0, -1, 1.5, NaN, Infinity, undefined, Number.MAX_SAFE_INTEGER + 1].forEach((value) => {
        expect(upgradeThreshold(value, 20000)).toBe(0);
        expect(upgradeThreshold(10000, value)).toBe(0);
    });
});

test.each([
    [9999, false],
    [10000, true],
    [450000, true],
    [750000, true],
    [750001, false],
    [1000000, false],
    [10000.5, false],
    ['450000', false],
    [NaN, false],
])('threshold %p is allowed: %p', (threshold, allowed) => {
    expect(thresholdAllowed(threshold)).toBe(allowed);
});

test('chances use the site language and at most four decimal places', () => {
    expect(chancePercent(450000, 'uk')).toMatch(/^45\s?%$/);
    expect(chancePercent(450000, 'en')).toBe('45%');
    expect(chancePercent(90909, 'en')).toBe('9.0909%');
    expect(chancePercent(90909, 'uk')).toMatch(/^9,0909\s?%$/);
    expect(chancePercent(1, 'en')).toBe('0.0001%');
    expect(chancePercent(0, 'en')).toBe('0%');
    expect(chancePercent(ROLL_SCALE, 'en')).toBe('100%');
    expect(chancePercent(90909, 'en-US')).toBe('9.0909%');
    expect(chancePercent(90909)).toMatch(/^9,0909\s?%$/);
});

test.each([
    [10000, { minPrice: 120, maxPrice: 9000 }],
    [1, { minPrice: 0.02, maxPrice: 0.9 }],
    [101, { minPrice: 1.22, maxPrice: 90.9 }],
    [999999999999, { minPrice: 11999999999.99, maxPrice: 899999999999.1 }],
])('target prices for %i kopiyky stay within the allowed chance range', (stakeKop, range) => {
    expect(targetPriceRange(stakeKop)).toEqual(range);
    expect(thresholdAllowed(upgradeThreshold(stakeKop, toKop(range.minPrice)))).toBe(true);
    expect(thresholdAllowed(upgradeThreshold(stakeKop, toKop(range.maxPrice)))).toBe(true);
});

test.each([
    [1.5, { minPrice: 135, maxPrice: 165 }],
    [2, { minPrice: 180, maxPrice: 220 }],
    [3, { minPrice: 270, maxPrice: 330 }],
    [5, { minPrice: 450, maxPrice: 550 }],
    [10, { minPrice: 900, maxPrice: 1100 }],
    [20, { minPrice: 1800, maxPrice: 2200 }],
])('multiplier %p gives a ten-percent window around its target price', (multiplier, range) => {
    expect(multiplierRange(10000, multiplier)).toEqual(range);
});

test('multiplier windows clip to both chance bounds', () => {
    expect(multiplierRange(10000, 1.2)).toEqual({ minPrice: 120, maxPrice: 132 });
    expect(multiplierRange(10000, 90)).toEqual({ minPrice: 8100, maxPrice: 9000 });
    expect(multiplierRange(10000, 1)).toEqual({ minPrice: 120, maxPrice: 120 });
    expect(multiplierRange(10000, 100)).toEqual({ minPrice: 9000, maxPrice: 9000 });
});

test('multiplier windows use whole kopiyky and keep tiny stakes selectable', () => {
    expect(multiplierRange(101, 1.5)).toEqual({ minPrice: 1.37, maxPrice: 1.66 });
    expect(multiplierRange(1, 1.5)).toEqual({ minPrice: 0.02, maxPrice: 0.02 });
});

test('empty or unusable stakes have an empty price range', () => {
    [0, -1, 1.5, undefined, NaN, Infinity].forEach((stakeKop) => {
        expect(targetPriceRange(stakeKop)).toEqual({ minPrice: 0, maxPrice: 0 });
        expect(multiplierRange(stakeKop, 2)).toEqual({ minPrice: 0, maxPrice: 0 });
    });
    [0, -1, undefined, NaN, Infinity].forEach((multiplier) => {
        expect(multiplierRange(10000, multiplier)).toEqual({ minPrice: 0, maxPrice: 0 });
    });
});

test.each([
    [0, 0],
    [1, 0.00036],
    [250000, 90],
    [500000, 180],
    [750000, 270],
    [999999, 359.99964],
])('roll %i maps to %p degrees around the ring', (roll, angle) => {
    expect(rollAngle(roll)).toBeCloseTo(angle, 8);
});
