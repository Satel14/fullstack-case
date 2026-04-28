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
        {
            id: 793,
            rare: ITEMS.RARITY.FACTORY_NEW,
            colors: allColors,
        },
        {
            id: 542,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 1139,
            rare: ITEMS.RARITY.FIELD_TESTED,
            colors: allColors,
        },
        {
            id: 731,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 1257,
            rare: ITEMS.RARITY.WELL_WORN,
            colors: allColors,
        },
        {
            id: 1212,
            rare: ITEMS.RARITY.FIELD_TESTED,
            colors: allColors,
        },
    ],
};

