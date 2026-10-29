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
    { id: 696, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1545, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 28, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1044, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1513, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1292, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 900, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1129, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 580, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 945, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 516, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 714, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1144, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 903, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1136, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 182, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
