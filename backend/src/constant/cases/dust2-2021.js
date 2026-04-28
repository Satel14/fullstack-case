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

    { id: 889, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1593, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1129, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1348, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 854, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1014, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1687, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 710, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1245, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 620, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 960, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 14, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1479, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1507, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1153, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1440, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1285, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 771, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors }

    ]
};
