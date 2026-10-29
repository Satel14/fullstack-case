const ITEMS_CONFIG = require('../../constant/itemConfigs')

const allColors = [
    ITEMS_CONFIG.COLORS.DEFAULT,
    ITEMS_CONFIG.COLORS.PAINTED,
];

module.exports = {
    CHANCES: {
        [ITEMS_CONFIG.GRADE.MILSPEC]: 7992,
        [ITEMS_CONFIG.GRADE.RESTRICTED]: 1598,
        [ITEMS_CONFIG.GRADE.CLASSIFIED]: 320,
        [ITEMS_CONFIG.GRADE.COVERT]: 64,
        [ITEMS_CONFIG.GRADE.SPECIAL]: 26,
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
    { id: 950, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1162, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 543, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 702, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1408, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 697, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1514, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1428, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 672, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 602, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 904, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1639, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1637, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1099, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1650, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 446, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
