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
        { id: 816, rare: ITEMS.RARITY.FACTORY_NEW, colors: allColors },
        { id: 1263, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 540, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1141, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1705, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1346, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1495, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 736, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1203, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1243, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1620, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 550, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1690, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1576, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 598, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};

