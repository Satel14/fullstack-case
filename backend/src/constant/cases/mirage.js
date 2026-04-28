const ITEMS = require('../../constant/itemConfigs')

const allColors = [
    ITEMS.COLORS.DEFAULT,
    ITEMS.COLORS.PAINTED,
];

module.exports = {
    CHANCES: {
        [ITEMS.RARITY.FACTORY_NEW]: 45,
        [ITEMS.RARITY.MINIMAL_WEAR]: 30,
        [ITEMS.RARITY.FIELD_TESTED]: 15,
        [ITEMS.RARITY.WELL_WORN]: 7,
        [ITEMS.RARITY.BATTLE_SCARRED]: 3,
        COLORS: {
            DEFAULT: 90,
            PAINTED: 10,
            LIST: {
                [ITEMS.COLORS.DEFAULT]: 50,
                [ITEMS.COLORS.PAINTED]: 50,
            },
        },
    },
    ITEMS: [
        { id: 1183, rare: ITEMS.RARITY.FACTORY_NEW, colors: allColors },
        { id: 1470, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1580, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1342, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 640, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1165, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1438, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 30, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1767, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1529, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 938, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 591, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1032, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1692, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 711, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
    ],
};

