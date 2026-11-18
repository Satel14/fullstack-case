export const SALE_RATE_MODULE = 'uah-credit-rate';

export const PRICE_CHANGED = 409;

export const isSaleRate = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

export const saleRateOf = (modules) => {
    const module = modules && modules[SALE_RATE_MODULE];
    if (!module) {
        return 1;
    }
    const rate = parseFloat(module.extraData);
    return isSaleRate(rate) ? rate : null;
};
