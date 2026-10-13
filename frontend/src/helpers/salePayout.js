const PLAIN_DECIMAL = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/;

const exactDecimal = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
        return null;
    }
    const [, whole, fraction = '', exponent = '0'] = PLAIN_DECIMAL.exec(String(number));
    return { digits: whole + fraction, power: Number(exponent) - fraction.length };
};

const multiplyDigits = (left, right) => {
    const product = new Array(left.length + right.length).fill(0);
    for (let i = left.length - 1; i >= 0; i -= 1) {
        for (let j = right.length - 1; j >= 0; j -= 1) {
            const sum = product[i + j + 1] + Number(left[i]) * Number(right[j]);
            product[i + j + 1] = sum % 10;
            product[i + j] += Math.floor(sum / 10);
        }
    }
    return product.join('');
};

const scaleByPowerOfTen = (digits, power) => (power >= 0
    ? `${digits}${'0'.repeat(power)}`
    : digits.slice(0, Math.max(digits.length + power, 0)) || '0');

export const salePayout = (price, rate) => {
    const exactPrice = exactDecimal(price);
    const exactRate = exactDecimal(rate);
    if (!exactPrice || !exactRate) {
        return 0;
    }
    const digits = multiplyDigits(exactPrice.digits, exactRate.digits);
    const power = exactPrice.power + exactRate.power + 2;
    return Number(scaleByPowerOfTen(digits, power)) / 100;
};
