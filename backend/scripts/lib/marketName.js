const ITEMS = require('../../src/constant/itemConfigs');

const WEAR_TO_MARKET = {
    [ITEMS.RARITY.FACTORY_NEW]: 'Factory New',
    [ITEMS.RARITY.MINIMAL_WEAR]: 'Minimal Wear',
    [ITEMS.RARITY.FIELD_TESTED]: 'Field-Tested',
    [ITEMS.RARITY.WELL_WORN]: 'Well-Worn',
    [ITEMS.RARITY.BATTLE_SCARRED]: 'Battle-Scarred',
};

const isKnife = (type) => type === ITEMS.TYPE.KNIFE;

const wearToMarket = (rare) => WEAR_TO_MARKET[rare] || 'Factory New';

const toMarketHashName = ({ name, type, rare }) => {
    const prefix = isKnife(type) ? '★ ' : '';
    return `${prefix}${name} (${wearToMarket(rare)})`;
};

module.exports = {
    isKnife, wearToMarket, toMarketHashName, WEAR_TO_MARKET,
};
