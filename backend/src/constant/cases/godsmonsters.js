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
        { id: 1651, rare: ITEMS.RARITY.FACTORY_NEW, colors: allColors },
        { id: 1127, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1076, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1673, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1481, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1607, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 1665, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 19, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 694, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 804, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1420, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 566, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1240, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 943, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
    ],
};

