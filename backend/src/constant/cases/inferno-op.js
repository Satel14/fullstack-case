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
    { id: 820, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 500, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1764, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 619, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1367, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 547, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 573, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 600, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1187, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1238, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1039, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1381, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1316, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 504, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1020, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 264, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
