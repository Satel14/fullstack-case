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
    { id: 861, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 525, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 700, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 877, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1069, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 594, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 809, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1267, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1019, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 825, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1074, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 896, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 992, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 928, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1077, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 114, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
