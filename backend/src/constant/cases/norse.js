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
        { id: 1645, rare: ITEMS.RARITY.FACTORY_NEW, colors: allColors },
        { id: 39, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 509, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 946, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1497, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 471, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1352, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1703, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1311, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1083, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1185, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 858, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 570, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1760, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 996, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1441, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1048, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1150, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
    ],
};

