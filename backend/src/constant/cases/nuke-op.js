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

    { id: 1063, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 817, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 647, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 956, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1190, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 726, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1397, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1512, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1121, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 29, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1022, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1433, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1557, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 592, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1592, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 728, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1237, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors }

    ]
};
