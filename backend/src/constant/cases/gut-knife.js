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
    { id: 199, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 185, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 200, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 205, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 204, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 186, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 189, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 183, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 197, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 193, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 198, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 184, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 195, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 188, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 196, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 191, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 190, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 201, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 203, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 202, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 194, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 182, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 192, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 187, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
