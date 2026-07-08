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
    { id: 658, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1609, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1109, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 956, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 571, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 536, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 639, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 675, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1389, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 552, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 588, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1115, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 823, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 951, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 596, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 277, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
