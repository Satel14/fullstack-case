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
    { id: 1564, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1375, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 779, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 560, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1540, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1702, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 945, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1386, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1512, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1475, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1353, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 586, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1443, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1452, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 612, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 440, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
