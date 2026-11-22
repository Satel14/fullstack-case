const ITEMS_CONFIG = require('../../constant/itemConfigs')

const allColors = [
    ITEMS_CONFIG.COLORS.DEFAULT,
    ITEMS_CONFIG.COLORS.PAINTED,
];

module.exports = {
    CHANCES: {
        [ITEMS_CONFIG.GRADE.SPECIAL]: 1,
        COLORS: {
            DEFAULT: 90,
            PAINTED: 10,
            LIST: {
                [ITEMS_CONFIG.COLORS.DEFAULT]: 50,
                [ITEMS_CONFIG.COLORS.PAINTED]: 50,
            },
        },
    },
    ITEMS: [
    { id: 283, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 284, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 270, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 288, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 289, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 277, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 273, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 282, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 279, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 281, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 286, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 268, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 267, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 269, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 276, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 287, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 280, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 272, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 285, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 274, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 275, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 278, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 266, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 271, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
