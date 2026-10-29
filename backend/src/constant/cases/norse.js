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
    { id: 1307, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1618, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1246, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 954, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1361, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 900, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 586, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1326, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 636, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1219, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1198, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 777, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1097, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 874, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 147, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
