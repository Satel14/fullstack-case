const { hmacDigest, floatsFromDigest } = require('./provablyFair');

const MIN_THRESHOLD = 10000;
const MAX_THRESHOLD = 750000;
const ROLL_SCALE = 1000000;
const MAX_STAKE_ITEMS = 6;

function upgradeRoll(serverSeed, clientSeed, nonce) {
    return Math.floor(floatsFromDigest(hmacDigest(serverSeed, clientSeed, nonce), 1)[0] * ROLL_SCALE);
}

function upgradeThreshold(stakeKop, targetKop) {
    return Number((900000n * BigInt(stakeKop)) / BigInt(targetKop));
}

function toKop(price) {
    const decimal = typeof price === 'number' ? price.toFixed(2) : price;
    const match = typeof decimal === 'string' && /^(\d+)(?:\.(\d{1,2}))?$/.exec(decimal);
    if (!match) {
        throw new RangeError('Price must be a non-negative decimal with at most two decimal places');
    }
    const kopiyky = BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0'));
    if (kopiyky > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new RangeError('Price exceeds the safe integer range in kopiyky');
    }
    return Number(kopiyky);
}

module.exports = {
    upgradeRoll, upgradeThreshold, toKop,
    MIN_THRESHOLD, MAX_THRESHOLD, ROLL_SCALE, MAX_STAKE_ITEMS,
};
