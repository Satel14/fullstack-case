const { toMarketHashName, isKnife, WEAR_TO_MARKET } = require('./marketName');
const { fallbackPriceUSD } = require('./fallbackPrice');

const STATTRAK_MULT = 1.4;
const MARKET_WEARS = Object.values(WEAR_TO_MARKET);

const toUAH = (usd, rate) => Math.max(1, Math.round(usd * rate));

const findAnyWearUSD = (item, marketIndex) => {
    const prefix = isKnife(item.type) ? '★ ' : '';
    for (const w of MARKET_WEARS) {
        const p = marketIndex.get(`${prefix}${item.name} (${w})`);
        if (p != null) return p;
    }
    return null;
};

const buildPriceEntry = (item, marketIndex, rate) => {
    const hash = toMarketHashName(item);
    let defUSD = marketIndex.get(hash);
    let matched = true;

    if (defUSD == null) defUSD = findAnyWearUSD(item, marketIndex);
    if (defUSD == null) {
        defUSD = fallbackPriceUSD(item);
        matched = false;
    }

    const stUSD = marketIndex.get(`StatTrak™ ${hash}`);
    const paintedUSD = stUSD != null ? stUSD : defUSD * STATTRAK_MULT;

    const defaultUAH = toUAH(defUSD, rate);
    const paintedUAH = Math.max(defaultUAH, toUAH(paintedUSD, rate));

    return { default: defaultUAH, painted: paintedUAH, matched };
};

module.exports = { buildPriceEntry, toUAH, STATTRAK_MULT };
