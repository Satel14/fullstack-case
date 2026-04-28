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
        { id: 929, rare: ITEMS.RARITY.FACTORY_NEW, colors: allColors },
        { id: 892, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 534, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 535, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 608, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1104, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1015, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1191, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 823, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 720, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 520, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 737, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 788, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1689, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1546, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1266, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
    ],
};

