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
    { id: 429, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 439, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 434, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 433, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 431, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 423, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 432, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 436, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 426, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 425, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 438, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 424, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 437, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 430, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 435, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 422, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 427, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 428, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
