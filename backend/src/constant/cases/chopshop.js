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
        { id: 1074, rare: ITEMS.RARITY.FACTORY_NEW, colors: allColors },
        { id: 663, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 556, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1154, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1358, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 610, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1426, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 759, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 472, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 857, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1050, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 526, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1699, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 464, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 10, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1213, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
    ],
};

