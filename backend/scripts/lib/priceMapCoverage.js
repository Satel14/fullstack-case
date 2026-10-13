const LISTED_IDS = 10;

const sameItem = (entry, item) => entry.name === item.name && entry.type === item.type && entry.rare === item.rare;

const priceMapGaps = (items, priceMap) => {
    const missing = [];
    const mismatched = [];
    for (const item of items) {
        const entry = Object.hasOwn(priceMap, item.itemId) ? priceMap[item.itemId] : null;
        if (!entry) {
            missing.push(item.itemId);
        } else if (!sameItem(entry, item)) {
            mismatched.push(item.itemId);
        }
    }
    return { missing, mismatched };
};

const listIds = (ids) => {
    const shown = ids.slice(0, LISTED_IDS).join(', ');
    return ids.length > LISTED_IDS ? `${shown} and ${ids.length - LISTED_IDS} more` : shown;
};

const requirePriceMapCoverage = (items, priceMap) => {
    const { missing, mismatched } = priceMapGaps(items, priceMap);
    const problems = [];
    if (missing.length > 0) {
        problems.push(`no price for ${missing.length} items: ${listIds(missing)}`);
    }
    if (mismatched.length > 0) {
        problems.push(`${mismatched.length} entries describe a different item: ${listIds(mismatched)}`);
    }
    if (problems.length > 0) {
        throw new Error(
            `priceMap.json does not match the item images (${problems.join('; ')}). `
            + 'Rebuild it from market data: node scripts/fetchMarketPrices.js, then node scripts/buildPriceMap.js.',
        );
    }
};

module.exports = { priceMapGaps, requirePriceMapCoverage };
