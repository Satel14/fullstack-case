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
    { id: 1620, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1547, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 771, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 864, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 821, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 805, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 693, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1725, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1608, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1253, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 921, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 505, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1165, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1212, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 639, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 207, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
