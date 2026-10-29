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
    { id: 773, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1752, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1220, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1601, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 785, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1414, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 816, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 669, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 508, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1071, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1644, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 966, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 714, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 849, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 527, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 342, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
