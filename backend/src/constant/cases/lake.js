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
    { id: 1686, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1769, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 615, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 835, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 840, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 731, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1280, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1236, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 968, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1760, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1329, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 520, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 1379, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 723, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 625, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 137, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
