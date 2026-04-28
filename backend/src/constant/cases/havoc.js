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

    { id: 928, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1168, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 634, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1038, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1536, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 709, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 525, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 42, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 781, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1450, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1600, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1251, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 812, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 560, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 17, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1269, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1555, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1362, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors }

    ]
};
