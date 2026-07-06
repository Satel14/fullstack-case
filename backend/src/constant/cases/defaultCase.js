const ITEMS = require('../../constant/itemConfigs')

const allColors = [
    ITEMS.COLORS.DEFAULT,
    ITEMS.COLORS.PAINTED,
];

const availableItemIds = [74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89];

const createDefaultCase = (seed = 0, count = 12) => {
    const items = [];
    const rarities = [
        ITEMS.RARITY.FACTORY_NEW,
        ITEMS.RARITY.MINIMAL_WEAR,
        ITEMS.RARITY.FIELD_TESTED,
        ITEMS.RARITY.WELL_WORN,
        ITEMS.RARITY.BATTLE_SCARRED,
    ];

    for (let i = 0; i < count; i++) {
        const itemIdIndex = (seed + i) % availableItemIds.length;
        items.push({
            id: availableItemIds[itemIdIndex],
            rare: rarities[i % rarities.length],
            colors: allColors,
        });
    }

    return {
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
        ITEMS: items,
    };
};

module.exports = createDefaultCase;

