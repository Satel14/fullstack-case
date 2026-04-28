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
        { id: 1003, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
        { id: 1710, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
        { id: 932, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1195, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1572, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 657, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 727, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1282, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
        { id: 41, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1753, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
        { id: 583, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
        { id: 1427, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
        { id: 1319, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
        { id: 11, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1465, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 826, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors }
    ]
}

