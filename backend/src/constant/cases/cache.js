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
    { id: 1685, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1551, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 796, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 871, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 831, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 819, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 639, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1720, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1620, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1238, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 935, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 505, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1144, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1110, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 749, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 213, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
