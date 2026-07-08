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
    { id: 552, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1738, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 999, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 658, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1434, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 42, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1009, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 806, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1098, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 777, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 582, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 617, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 2, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 499, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 896, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 245, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
