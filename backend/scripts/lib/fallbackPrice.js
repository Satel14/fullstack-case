const ITEMS = require('../../src/constant/itemConfigs');

const BASE_BAND_USD = {
    [ITEMS.TYPE.KNIFE]: [40, 200],
    [ITEMS.TYPE.SNIPER_RIFLES]: [5, 80],
    [ITEMS.TYPE.ASSAULT_RIFLES]: [1, 40],
    [ITEMS.TYPE.MACHINE_GUNS]: [0.5, 10],
    [ITEMS.TYPE.SUBMACHINE_GUNS]: [0.3, 12],
    [ITEMS.TYPE.SHOTGUNS]: [0.3, 8],
    [ITEMS.TYPE.PISTOLS]: [0.3, 15],
};

const WEAR_MULT = {
    [ITEMS.RARITY.FACTORY_NEW]: 1.0,
    [ITEMS.RARITY.MINIMAL_WEAR]: 0.85,
    [ITEMS.RARITY.FIELD_TESTED]: 0.65,
    [ITEMS.RARITY.WELL_WORN]: 0.5,
    [ITEMS.RARITY.BATTLE_SCARRED]: 0.4,
};

const hashFraction = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
};

const fallbackPriceUSD = ({ name, type, rare }) => {
    const band = BASE_BAND_USD[type] || [0.3, 10];
    const base = band[0] + hashFraction(name) * (band[1] - band[0]);
    const mult = WEAR_MULT[rare] != null ? WEAR_MULT[rare] : 0.65;
    return Math.max(0.03, base * mult);
};

module.exports = { fallbackPriceUSD, BASE_BAND_USD, WEAR_MULT };
