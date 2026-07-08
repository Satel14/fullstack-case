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
    { id: 1587, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 649, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 597, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 638, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 513, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1629, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 564, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1442, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 464, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 470, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1329, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 944, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 570, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 744, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1269, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 448, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
