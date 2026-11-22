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
    { id: 210, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 223, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 209, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 228, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 222, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 216, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 229, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 207, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 217, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 224, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 213, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 219, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 208, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 220, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 206, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 227, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 226, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 218, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 212, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 215, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 225, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 214, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 211, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 221, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
