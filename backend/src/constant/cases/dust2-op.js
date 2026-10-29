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
    { id: 1530, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1702, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1251, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1292, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1309, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 819, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 740, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1345, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 612, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1390, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1347, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1295, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 668, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1624, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1020, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 133, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
