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
    { id: 1284, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1307, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1484, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1385, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1329, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1717, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1602, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1084, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1080, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1569, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 883, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1538, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1652, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 860, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1002, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 213, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
