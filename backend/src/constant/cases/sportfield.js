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

    { id: 1068, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1039, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 621, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1453, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 600, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1588, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 832, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1769, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1262, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 750, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 905, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 988, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 824, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1554, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1218, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1413, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors }

    ]
};
