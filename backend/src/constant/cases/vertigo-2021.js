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

    { id: 1077, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1166, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 596, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1018, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 723, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1209, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 890, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 35, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1528, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1235, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 654, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1737, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1549, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1605, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 986, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1302, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 567, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 473, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1385, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors }

    ]
};
