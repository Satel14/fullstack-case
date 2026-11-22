const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { hmacDigest, floatsFromDigest } = require('../src/modules/provablyFair');
const {
    upgradeRoll, upgradeThreshold, toKop,
    MIN_THRESHOLD, MAX_THRESHOLD, ROLL_SCALE, MAX_STAKE_ITEMS,
} = require('../src/modules/upgradeFair');
const GOLDEN = require('./fixtures/upgrade-golden.json');

const independentRoll = (serverSeed, clientSeed, nonce) => {
    const digest = crypto.createHmac('sha256', serverSeed)
        .update(`${clientSeed}:${nonce}`).digest('hex');
    return Math.floor((parseInt(digest.slice(0, 8), 16) / 2 ** 32) * 1000000);
};

test('upgrade constants match the approved limits and roll scale', () => {
    assert.equal(MIN_THRESHOLD, 10000);
    assert.equal(MAX_THRESHOLD, 750000);
    assert.equal(ROLL_SCALE, 1000000);
    assert.equal(MAX_STAKE_ITEMS, 6);
});

test('upgradeRoll matches an independent HMAC computation for 50 random inputs', () => {
    for (let i = 0; i < 50; i += 1) {
        const serverSeed = crypto.randomBytes(32).toString('hex');
        const clientSeed = crypto.randomBytes(32).toString('hex');
        const nonce = crypto.randomInt(0, 2147483648);
        const input = JSON.stringify({ serverSeed, clientSeed, nonce });
        const roll = upgradeRoll(serverSeed, clientSeed, nonce);
        assert.equal(roll, independentRoll(serverSeed, clientSeed, nonce), input);
        assert.ok(Number.isInteger(roll) && roll >= 0 && roll < 1000000, input);
    }
});

test('upgradeRoll uses the same first float as a case open', () => {
    for (const { serverSeed, clientSeed, nonce } of GOLDEN) {
        const [firstFloat] = floatsFromDigest(hmacDigest(serverSeed, clientSeed, nonce), 4);
        assert.equal(upgradeRoll(serverSeed, clientSeed, nonce), Math.floor(firstFloat * 1000000));
    }
});

test('upgradeRoll reproduces all 300 frozen golden vectors', () => {
    assert.equal(GOLDEN.length, 300);
    assert.equal(new Set(GOLDEN.map(({ serverSeed, clientSeed, nonce }) =>
        JSON.stringify([serverSeed, clientSeed, nonce]))).size, 300);
    for (const vector of GOLDEN) {
        const { serverSeed, clientSeed, nonce, roll } = vector;
        const input = JSON.stringify(vector);
        assert.equal(independentRoll(serverSeed, clientSeed, nonce), roll, input);
        assert.equal(upgradeRoll(serverSeed, clientSeed, nonce), roll, input);
        assert.ok(Number.isInteger(roll) && roll >= 0 && roll < 1000000, input);
    }
});

const THRESHOLDS = [
    { stakeKop: 10000, targetKop: 20000, threshold: 450000 },
    { stakeKop: 1, targetKop: 3, threshold: 300000 },
    { stakeKop: 100, targetKop: 120, threshold: 750000 },
    { stakeKop: 100, targetKop: 119, threshold: 756302 },
    { stakeKop: 100, targetKop: 121, threshold: 743801 },
    { stakeKop: 1, targetKop: 90, threshold: 10000 },
    { stakeKop: 1, targetKop: 89, threshold: 10112 },
    { stakeKop: 1, targetKop: 91, threshold: 9890 },
    { stakeKop: 0, targetKop: 100, threshold: 0 },
    { stakeKop: 2, targetKop: 1, threshold: 1800000 },
];

for (const { stakeKop, targetKop, threshold } of THRESHOLDS) {
    test(`upgradeThreshold(${stakeKop}, ${targetKop}) returns ${threshold} without clamping`, () => {
        assert.equal(upgradeThreshold(stakeKop, targetKop), threshold);
    });
}

test('upgradeThreshold stays exact when the scaled stake exceeds safe integer precision', () => {
    assert.equal(upgradeThreshold(449999224999, 900000449999), 449998);
});

test('toKop converts decimal strings and numeric prices to integer kopiyky', () => {
    const prices = [
        ['0', 0], ['0.00', 0], [0, 0], ['12', 1200], [12, 1200],
        ['12.5', 1250], ['12.50', 1250], [12.5, 1250],
        ['0.01', 1], [0.01, 1], ['0.29', 29], [0.29, 29],
        ['12.34', 1234], [12.34, 1234], ['0012.50', 1250],
        ['9999999999.99', 999999999999], [9999999999.99, 999999999999],
    ];
    for (const [price, kopiyky] of prices) {
        assert.equal(toKop(price), kopiyky, JSON.stringify(price));
    }
});

test('toKop normalizes floating-point residue in numeric prices', () => {
    assert.equal(toKop(0.1 + 0.2), 30);
    assert.equal(toKop(0.3 - 0.2), 10);
    assert.equal(toKop(0.1 + 0.7), 80);
    assert.equal(toKop(1.1 - 1), 10);
});

test('toKop preserves decimal strings through the largest safe integer result', () => {
    assert.equal(toKop('90071992547409.91'), Number.MAX_SAFE_INTEGER);
    assert.throws(() => toKop('90071992547409.92'), RangeError);
});

test('toKop rejects malformed, negative and non-finite prices', () => {
    for (const price of ['', 'abc', '12.345', '-1', -1, NaN, Infinity, -Infinity, null, undefined, true, [], {}]) {
        assert.throws(() => toKop(price), RangeError, String(price));
    }
});

test('six item prices sum in kopiyky before calculating the threshold', () => {
    const stakeKop = ['0.10', '0.20', '0.29', '0.01', '12.50', '12.34']
        .reduce((sum, price) => sum + toKop(price), 0);
    assert.equal(stakeKop, 2544);
    assert.equal(upgradeThreshold(stakeKop, toKop('50.88')), 450000);
});
