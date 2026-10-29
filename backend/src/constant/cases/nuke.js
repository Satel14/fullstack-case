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
    { id: 764, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 870, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1741, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1207, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1597, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1513, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 593, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1008, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1326, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 590, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 659, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1277, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 801, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1733, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 925, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 182, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
