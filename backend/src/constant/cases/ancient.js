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
    { id: 671, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1672, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 991, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 870, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 605, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 544, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 593, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 636, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1278, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 552, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 595, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1081, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 865, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1082, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 875, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 311, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
