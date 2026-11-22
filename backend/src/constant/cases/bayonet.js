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
    { id: 67, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 68, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 72, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 53, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 66, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 73, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 60, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 54, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 61, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 51, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 57, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 63, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 52, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 56, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 64, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 59, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 71, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 69, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 58, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 62, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 70, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 50, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 55, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 65, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
