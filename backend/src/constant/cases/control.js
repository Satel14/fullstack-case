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
    { id: 863, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 525, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 678, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 879, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1119, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 565, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 874, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1379, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1106, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 890, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1107, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 919, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1037, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 888, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 924, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 112, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
