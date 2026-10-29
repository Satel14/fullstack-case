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
    { id: 506, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1306, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1217, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1546, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1152, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1367, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1538, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 655, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1341, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1402, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 993, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 893, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 909, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1099, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1062, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 402, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
