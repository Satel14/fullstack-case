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
        { id: 1096, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
        { id: 907, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
        { id: 1525, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
        { id: 833, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
        { id: 1359, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1296, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1027, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 981, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 936, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
        { id: 790, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
        { id: 693, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1669, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
        { id: 486, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
        { id: 1447, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
        { id: 1170, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
        { id: 1494, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1751, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 779, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1220, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors }
    ]
}

