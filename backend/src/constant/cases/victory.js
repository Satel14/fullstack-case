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
    { id: 1574, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1476, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1715, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 773, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 20, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1100, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1327, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1131, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 869, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1366, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 665, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1086, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 952, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 637, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1106, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 123, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
