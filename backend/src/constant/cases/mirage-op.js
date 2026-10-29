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
    { id: 1543, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 870, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1041, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 882, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1424, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 609, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1740, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1402, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1191, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1656, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1576, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 739, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1600, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1062, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 937, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 86, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
