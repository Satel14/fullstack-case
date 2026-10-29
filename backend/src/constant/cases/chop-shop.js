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
    { id: 784, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 521, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1303, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1543, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 502, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 574, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1711, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1440, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1473, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1541, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1483, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1314, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 513, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 637, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 625, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 257, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
