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
            id: 1658,
            rare: ITEMS.RARITY.FACTORY_NEW,
            colors: allColors,
        },
        {
            id: 1417,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 627,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 1275,
            rare: ITEMS.RARITY.FIELD_TESTED,
            colors: allColors,
        },
        {
            id: 1304,
            rare: ITEMS.RARITY.FIELD_TESTED,
            colors: allColors,
        },
        {
            id: 1059,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 1225,
            rare: ITEMS.RARITY.WELL_WORN,
            colors: allColors,
        },
        {
            id: 1599,
            rare: ITEMS.RARITY.FIELD_TESTED,
            colors: allColors,
        },
        {
            id: 681,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 575,
            rare: ITEMS.RARITY.WELL_WORN,
            colors: allColors,
        },
        {
            id: 1573,
            rare: ITEMS.RARITY.BATTLE_SCARRED,
            colors: allColors,
        },
        {
            id: 1252,
            rare: ITEMS.RARITY.BATTLE_SCARRED,
            colors: allColors,
        },
        {
            id: 803,
            rare: ITEMS.RARITY.FIELD_TESTED,
            colors: allColors,
        },
        {
            id: 941,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 976,
            rare: ITEMS.RARITY.FIELD_TESTED,
            colors: allColors,
        },
    ],
};

