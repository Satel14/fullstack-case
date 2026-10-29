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
    { id: 475, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1687, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 991, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1490, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1408, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 561, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1011, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 42, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1633, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 490, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 777, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1099, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 937, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 191, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
