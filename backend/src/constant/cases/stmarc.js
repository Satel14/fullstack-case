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
        { id: 926, rare: ITEMS.RARITY.FACTORY_NEW, colors: allColors },
        { id: 1493, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 951, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 661, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1762, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 594, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1448, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1005, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1589, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 818, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1297, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1534, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1103, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1574, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1396, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1278, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1386, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 12, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
    ],
};

