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
    { id: 1537, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1247, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1540, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1366, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1163, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1350, rare: ITEMS_CONFIG.RARITY.FACTORY_NEW, colors: allColors },
    { id: 1726, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1586, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1030, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1423, rare: ITEMS_CONFIG.RARITY.MINIMAL_WEAR, colors: allColors },
    { id: 1502, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 580, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 705, rare: ITEMS_CONFIG.RARITY.FIELD_TESTED, colors: allColors },
    { id: 890, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 1182, rare: ITEMS_CONFIG.RARITY.WELL_WORN, colors: allColors },
    { id: 347, rare: ITEMS_CONFIG.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};
