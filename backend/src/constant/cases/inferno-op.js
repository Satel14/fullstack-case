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

    { id: 1169, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 579, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1424, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 915, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 757, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 840, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1749, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1101, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1268, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1345, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 641, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1550, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 780, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1211, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1400, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1489, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 965, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1611, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors }

    ]
};
