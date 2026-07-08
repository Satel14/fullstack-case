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
    { id: 1620, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1546, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 773, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 869, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 822, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 808, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 695, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1729, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1614, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1253, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 909, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 505, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1150, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1213, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 657, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 208, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
