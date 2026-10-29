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
    { id: 558, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1727, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 982, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 687, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1415, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 41, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 951, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 661, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1037, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 660, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 515, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 596, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 38, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 603, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 929, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 281, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
