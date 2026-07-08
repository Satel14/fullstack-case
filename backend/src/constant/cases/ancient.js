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
    { id: 643, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1608, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1101, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 953, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 565, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 532, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 640, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 675, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1389, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 552, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 570, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1107, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 806, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 951, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 617, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 280, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
