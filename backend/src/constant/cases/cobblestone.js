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

    { id: 1636, rare: 7, colors: allColors },
    { id: 1078, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 512, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 465, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1462, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 674, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 863, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1214, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1287, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1233, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 546, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1363, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1601, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1532, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1725, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors }

    ]
};
