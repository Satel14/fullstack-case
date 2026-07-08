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
    { id: 979, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 14, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1371, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1488, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 33, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 615, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1675, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1395, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1577, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1555, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1138, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1321, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1767, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 932, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1448, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 190, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
