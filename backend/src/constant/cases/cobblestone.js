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
    { id: 1622, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 932, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 480, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1447, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 469, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 918, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 634, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1388, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1465, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1457, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 707, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1600, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 909, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1743, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1406, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 69, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
