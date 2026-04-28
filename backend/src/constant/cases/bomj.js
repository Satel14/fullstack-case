const ITEMS = require('../../constant/itemConfigs')

const allColors = [
    ITEMS.COLORS.PAINTED,
    ITEMS.COLORS.PAINTED,
    ITEMS.COLORS.PAINTED,
    ITEMS.COLORS.PAINTED,
    ITEMS.COLORS.PAINTED,
    ITEMS.COLORS.PAINTED,
    ITEMS.COLORS.PAINTED,
    ITEMS.COLORS.PAINTED,
    ITEMS.COLORS.PAINTED,
    ITEMS.COLORS.PAINTED,
    ITEMS.COLORS.PAINTED,
    ITEMS.COLORS.PAINTED,
    ITEMS.COLORS.PAINTED,
];

module.exports = {
    CHANCES: {
        [ITEMS.RARITY.FACTORY_NEW]: 55,
        [ITEMS.RARITY.FACTORY_NEW]: 28,
        [ITEMS.RARITY.FACTORY_NEW]: 12,
        [ITEMS.RARITY.FACTORY_NEW]: 4,
        [ITEMS.RARITY.FACTORY_NEW]: 1,
        COLORS: {
            DEFAULT: 95,
            PAINTED: 5,
            LIST: {
                [ITEMS.COLORS.DEFAULT]: 5,
                [ITEMS.COLORS.DEFAULT]: 4,
                [ITEMS.COLORS.DEFAULT]: 10,
                [ITEMS.COLORS.DEFAULT]: 6,
                [ITEMS.COLORS.DEFAULT]: 9,
                [ITEMS.COLORS.DEFAULT]: 10,
                [ITEMS.COLORS.DEFAULT]: 6,
                [ITEMS.COLORS.DEFAULT]: 12,
                [ITEMS.COLORS.DEFAULT]: 7,
                [ITEMS.COLORS.DEFAULT]: 7,
                [ITEMS.COLORS.DEFAULT]: 7,
                [ITEMS.COLORS.DEFAULT]: 7,
                [ITEMS.COLORS.DEFAULT]: 10,
            },
        },
    },
    ITEMS: [
        {
            id: 74,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 75,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 76,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 77,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 78,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 79,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 80,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 81,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 82,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 83,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 18,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 20,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 84,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 85,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 86,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 87,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 88,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
        {
            id: 89,
            rare: ITEMS.RARITY.MINIMAL_WEAR,
            colors: allColors,
        },
    ],
};
