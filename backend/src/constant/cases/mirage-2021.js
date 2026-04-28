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

    { id: 1635, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 510, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1411, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 958, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 651, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1308, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 861, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1477, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 8, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1162, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 479, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1540, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 975, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 554, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1758, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 724, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1381, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1544, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1205, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors }

    ]
};
