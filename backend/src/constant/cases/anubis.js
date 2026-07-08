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
    { id: 1279, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 658, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1164, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 489, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 31, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 915, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 966, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 672, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1050, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1741, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1434, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 549, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1622, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1733, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1191, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 79, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
