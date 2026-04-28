const ITEMS_CONFIG = require('../../constant/itemConfigs')

const allColors = [
    ITEMS_CONFIG.COLORS.DEFAULT,
    ITEMS_CONFIG.COLORS.PAINTED,
];

module.exports = {
    CHANCES: {
        [ITEMS_CONFIG.RARITY.FACTORY_NEW]: 30,
        [ITEMS_CONFIG.RARITY.MINIMAL_WEAR]: 30,
        [ITEMS_CONFIG.RARITY.FIELD_TESTED]: 20,
        [ITEMS_CONFIG.RARITY.WELL_WORN]: 15,
        [ITEMS_CONFIG.RARITY.BATTLE_SCARRED]: 5,
        COLORS: {
            DEFAULT: 90,
            PAINTED: 10,
            LIST: {
                [ITEMS_CONFIG.COLORS.DEFAULT]: 50,
                [ITEMS_CONFIG.COLORS.PAINTED]: 50,
            },
        },
    },
    ITEMS: [

    { id: 1641, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1058, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 867, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 585, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 998, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1587, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 678, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1765, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1113, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1716, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1410, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1184, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 536, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 577, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1306, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1454, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 964, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 729, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 478, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors }

    ]
};
