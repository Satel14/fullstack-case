export const computeItemPriceUAH = (pricesObj, color, creditRate = 1) => {
    if (!pricesObj) {
        return null;
    }
    const key = String(color || '').toLowerCase().replace(' ', '');
    const raw = pricesObj[key];
    if (!raw) {
        return null;
    }
    return parseInt(raw * creditRate * 100, 10) / 100;
};
