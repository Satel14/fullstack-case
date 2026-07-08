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
    { id: 1587, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 644, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 581, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 629, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 506, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1659, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 553, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1438, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 42, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 469, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1329, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 947, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 566, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 732, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1267, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 449, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
