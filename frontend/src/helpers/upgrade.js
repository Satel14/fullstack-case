import { siteLanguage } from '../i18n/language';

export const ROLL_SCALE = 1000000;
export const MIN_THRESHOLD = 10000;
export const MAX_THRESHOLD = 750000;
export const MAX_STAKE_ITEMS = 6;
export const MULTIPLIERS = [1.5, 2, 3, 5, 10, 20];

export const toKop = (price) => {
    if (typeof price !== 'number' && typeof price !== 'string') {
        return 0;
    }
    const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(price).trim());
    if (!match || !Number.isFinite(Number(price)) || Number(price) <= 0) {
        return 0;
    }
    const [, whole, fraction = '', exponent = '0'] = match;
    const digits = BigInt(whole + fraction);
    const power = Number(exponent) - fraction.length + 2;
    let kopiyky;
    if (power >= 0) {
        kopiyky = digits * (BigInt(10) ** BigInt(power));
    } else {
        const divisor = BigInt(10) ** BigInt(-power);
        kopiyky = (digits + divisor / BigInt(2)) / divisor;
    }
    const result = Number(kopiyky);
    return Number.isSafeInteger(result) ? result : 0;
};

const isPositiveKop = (value) => Number.isSafeInteger(value) && value > 0;

export const upgradeThreshold = (stakeKop, targetKop) => {
    if (!isPositiveKop(stakeKop) || !isPositiveKop(targetKop)) {
        return 0;
    }
    return Number((BigInt(900000) * BigInt(stakeKop)) / BigInt(targetKop));
};

export const thresholdAllowed = (threshold) => Number.isInteger(threshold)
    && threshold >= MIN_THRESHOLD && threshold <= MAX_THRESHOLD;

export const chancePercent = (threshold, language) => new Intl.NumberFormat(siteLanguage(language), {
    style: 'percent',
    maximumFractionDigits: 4,
}).format(threshold / ROLL_SCALE);

export const rollPercent = (roll, language) => new Intl.NumberFormat(siteLanguage(language), {
    style: 'percent',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
}).format(roll / ROLL_SCALE);

const targetKopRange = (stakeKop) => {
    if (!isPositiveKop(stakeKop)) {
        return { minKop: 0, maxKop: 0 };
    }
    const numerator = BigInt(900000) * BigInt(stakeKop);
    const upperThreshold = BigInt(MAX_THRESHOLD);
    return {
        minKop: Number((numerator + upperThreshold - BigInt(1)) / upperThreshold),
        maxKop: Number(numerator / BigInt(MIN_THRESHOLD)),
    };
};

const rangeInCredits = ({ minKop, maxKop }) => ({ minPrice: minKop / 100, maxPrice: maxKop / 100 });

export const targetPriceRange = (stakeKop) => rangeInCredits(targetKopRange(stakeKop));

export const multiplierRange = (stakeKop, multiplier) => {
    const multiplierHundredths = toKop(multiplier);
    if (!isPositiveKop(stakeKop) || multiplierHundredths === 0) {
        return { minPrice: 0, maxPrice: 0 };
    }
    const bounds = targetKopRange(stakeKop);
    const product = BigInt(stakeKop) * BigInt(multiplierHundredths);
    const windowMin = Number((product * BigInt(9) + BigInt(999)) / BigInt(1000));
    const windowMax = Number((product * BigInt(11)) / BigInt(1000));
    const minKop = Math.min(bounds.maxKop, Math.max(bounds.minKop, windowMin));
    const maxKop = Math.min(bounds.maxKop, Math.max(minKop, windowMax));
    return rangeInCredits({ minKop, maxKop });
};

export const rollAngle = (roll) => (roll / ROLL_SCALE) * 360;
