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
        { id: 1087, rare: ITEMS.RARITY.FACTORY_NEW, colors: allColors },
        { id: 1730, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1007, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 615, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1480, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 7, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1052, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1696, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 846, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 940, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1735, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1419, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1707, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 786, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 551, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};

