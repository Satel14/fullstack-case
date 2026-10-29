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
    { id: 1309, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1355, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1543, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1433, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1361, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1741, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1598, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1070, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1071, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1531, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 908, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1634, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1652, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 895, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1001, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 219, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
