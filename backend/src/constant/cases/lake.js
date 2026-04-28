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
        { id: 548, rare: ITEMS.RARITY.FACTORY_NEW, colors: allColors },
        { id: 1535, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 853, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1147, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1662, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1567, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 522, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 980, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1301, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
        { id: 962, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 712, rare: ITEMS.RARITY.BATTLE_SCARRED, colors: allColors },
        { id: 1042, rare: ITEMS.RARITY.FIELD_TESTED, colors: allColors },
        { id: 1181, rare: ITEMS.RARITY.MINIMAL_WEAR, colors: allColors },
        { id: 1300, rare: ITEMS.RARITY.WELL_WORN, colors: allColors },
    ],
};

