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
        { id: 809, rare: ITEMS.RARITY.FACTORY_NEW, colors: allColors },
        { id: 741, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1128, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1310, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1594, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1513, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1199, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1277, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1562, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
    ],
};

