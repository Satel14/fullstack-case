const ITEMS_CONFIG = require('../../constant/itemConfigs')

const allColors = [
    ITEMS_CONFIG.COLORS.DEFAULT,
    ITEMS_CONFIG.COLORS.PAINTED,
];

module.exports = {
    CHANCES: {
        [ITEMS_CONFIG.RARITY.FACTORY_NEW]: 55,
        [ITEMS_CONFIG.RARITY.MINIMAL_WEAR]: 28,
        [ITEMS_CONFIG.RARITY.FIELD_TESTED]: 12,
        [ITEMS_CONFIG.RARITY.WELL_WORN]: 4,
        [ITEMS_CONFIG.RARITY.BATTLE_SCARRED]: 1,
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
    { id: 820, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 844, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1023, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1087, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1432, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1024, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 870, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 536, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1494, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1600, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1430, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 11, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1538, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 645, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 656, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 363, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
