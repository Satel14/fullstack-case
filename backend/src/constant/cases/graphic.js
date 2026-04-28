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

    { id: 1631, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 533, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 949, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 487, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1498, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1126, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 882, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1152, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1314, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 989, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1035, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 676, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1421, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 21, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors }

    ]
};
