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

    { id: 730, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 884, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 493, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1049, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 519, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 631, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1382, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1584, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1680, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1224, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1273, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1148, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 26, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1425, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 766, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 828, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors }

    ]
};
