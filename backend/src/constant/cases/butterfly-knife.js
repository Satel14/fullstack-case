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
    { id: 115, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 116, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 101, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 108, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 121, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 102, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 111, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 114, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 120, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 109, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 99, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 113, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 105, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 100, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 118, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 104, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 119, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 98, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 117, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 112, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 110, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 106, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 103, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 107, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
