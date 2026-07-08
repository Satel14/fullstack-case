const ITEMS_CONFIG = require('../../constant/itemConfigs')

const allColors = [
    ITEMS_CONFIG.COLORS.DEFAULT,
    ITEMS_CONFIG.COLORS.PAINTED,
];

module.exports = {
    CHANCES: {
        [ITEMS_CONFIG.RARITY.FACTORY_NEW]: 55,
        [ITEMS_CONFIG.RARITY.MINIMAL_WEAR]: 28,
        [ITEMS_CONFIG.RARITY.FIELD_TESTED]: 12,
        [ITEMS_CONFIG.RARITY.WELL_WORN]: 4,
        [ITEMS_CONFIG.RARITY.BATTLE_SCARRED]: 1,
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
    { id: 1296, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 686, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1164, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 489, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 31, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 916, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 971, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 678, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1060, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1741, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1405, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 533, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1630, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1734, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1166, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 71, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
