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
    { id: 1172, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 37, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 970, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1476, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 979, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1178, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1327, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 721, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1183, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1158, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 848, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1483, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 527, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 849, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 338, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
