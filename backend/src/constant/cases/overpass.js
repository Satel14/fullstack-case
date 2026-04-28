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

    { id: 875, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1634, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 459, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 945, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 576, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1321, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1374, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1034, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 662, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1261, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 537, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1095, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1542, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 606, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1409, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 49, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors }

    ]
};
