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
    { id: 785, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 743, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1530, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 979, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1359, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1304, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1023, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 559, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 740, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 956, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1445, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 665, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 762, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1630, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 920, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 416, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
