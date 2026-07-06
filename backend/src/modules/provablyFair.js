const crypto = require('crypto');
const ITEM_CONFIG = require('../constant/itemConfigs');

function sha256(str) {
    return crypto.createHash('sha256').update(String(str)).digest('hex');
}

function hmacDigest(serverSeed, clientSeed, nonce) {
    return crypto
        .createHmac('sha256', String(serverSeed))
        .update(`${clientSeed}:${nonce}`)
        .digest('hex');
}

// Each 8-hex (4-byte) chunk -> integer / 2^32 -> float in [0,1). Up to 8 floats.
function floatsFromDigest(digestHex, count) {
    const floats = [];
    for (let k = 0; k < count; k++) {
        const chunk = digestHex.slice(k * 8, k * 8 + 8);
        floats.push(parseInt(chunk, 16) / 0x100000000);
    }
    return floats;
}

function rarityKeys(caseDef) {
    return Object.keys(caseDef.CHANCES).filter((k) => k !== 'COLORS');
}

function mostCommonRareWithItems(caseDef) {
    const raresWithItems = new Set(caseDef.ITEMS.map((i) => i.rare));
    let best = null;
    let bestWeight = -Infinity;
    for (const key of rarityKeys(caseDef)) {
        if (!raresWithItems.has(key)) continue;
        if (caseDef.CHANCES[key] > bestWeight) {
            bestWeight = caseDef.CHANCES[key];
            best = key;
        }
    }
    return best;
}

function pickRarity(caseDef, f0) {
    const keys = rarityKeys(caseDef);
    const maxWeight = keys.reduce((a, k) => a + caseDef.CHANCES[k], 0);
    const roll = 1 + Math.floor(f0 * maxWeight); // [1, maxWeight]
    let cumulative = 0;
    for (const key of keys) {
        cumulative += caseDef.CHANCES[key];
        if (roll <= cumulative) return key;
    }
    return keys[keys.length - 1];
}

function pickItem(caseDef, rarity, f1) {
    let collection = caseDef.ITEMS.filter((i) => i.rare === rarity);
    let resolvedRare = rarity;
    if (collection.length === 0) {
        resolvedRare = mostCommonRareWithItems(caseDef);
        collection = caseDef.ITEMS.filter((i) => i.rare === resolvedRare);
        if (collection.length === 0) collection = caseDef.ITEMS;
    }
    const idx = Math.floor(f1 * collection.length);
    const item = collection[Math.min(idx, collection.length - 1)];
    return { item, resolvedRare };
}

function normalizeColors(caseDef, colors) {
    const list = caseDef.CHANCES.COLORS.LIST || {};
    const out = {};
    for (const color in colors) {
        if (colors[color] && color !== 'default') {
            out[color] = list[color];
        }
    }
    return out;
}

function pickPaintedColor(colorWeights, f3) {
    const values = Object.values(colorWeights);
    if (values.length === 0) return ITEM_CONFIG.COLORS.DEFAULT;
    const max = values.reduce((a, b) => a + b, 0);
    const roll = Math.floor(f3 * max);
    let sum = 0;
    for (const key in colorWeights) {
        if (roll < sum + colorWeights[key]) return key;
        sum += colorWeights[key];
    }
    return Object.keys(colorWeights)[Object.keys(colorWeights).length - 1];
}

function pickColor(caseDef, item, itemHash, f2, f3) {
    if (item.colors.length === 1) return item.colors[0];

    const cached = itemHash[item.id.toString()];
    if (!cached) return ITEM_CONFIG.COLORS.DEFAULT;
    const itemColors = normalizeColors(caseDef, JSON.parse(JSON.parse(cached).pricesInCredits));
    if (Object.keys(itemColors).length <= 1) return ITEM_CONFIG.COLORS.DEFAULT;

    const paintMax = caseDef.CHANCES.COLORS.DEFAULT + caseDef.CHANCES.COLORS.PAINTED;
    const paintRoll = Math.floor(f2 * paintMax);
    if (paintRoll >= caseDef.CHANCES.COLORS.DEFAULT) {
        return pickPaintedColor(itemColors, f3);
    }
    return ITEM_CONFIG.COLORS.DEFAULT;
}

function deriveWinner(serverSeed, clientSeed, nonce, caseDef, itemHash) {
    const [f0, f1, f2, f3] = floatsFromDigest(hmacDigest(serverSeed, clientSeed, nonce), 4);
    const rarity = pickRarity(caseDef, f0);
    const { item, resolvedRare } = pickItem(caseDef, rarity, f1);
    const color = pickColor(caseDef, item, itemHash, f2, f3);
    return { rarity: resolvedRare, itemId: item.id, color };
}

module.exports = { sha256, hmacDigest, floatsFromDigest, deriveWinner };
