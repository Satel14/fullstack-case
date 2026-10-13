const PLAIN_DECIMAL = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/;

const exactDecimal = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
        return null;
    }
    const [, whole, fraction = '', exponent = '0'] = PLAIN_DECIMAL.exec(String(number));
    return { digits: BigInt(whole + fraction), power: Number(exponent) - fraction.length };
};

const salePayout = (price, rate) => {
    const exactPrice = exactDecimal(price);
    const exactRate = exactDecimal(rate);
    if (!exactPrice || !exactRate) {
        return 0;
    }
    const digits = exactPrice.digits * exactRate.digits;
    const power = exactPrice.power + exactRate.power + 2;
    const kopiyky = power >= 0 ? digits * 10n ** BigInt(power) : digits / 10n ** BigInt(-power);
    return Number(kopiyky) / 100;
};

module.exports = { salePayout };
