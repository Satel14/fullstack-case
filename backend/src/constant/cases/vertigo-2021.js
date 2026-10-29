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
    { id: 1490, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 697, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1266, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1546, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 23, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1275, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 6, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1318, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 580, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 900, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 677, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 880, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 798, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1667, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1649, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 256, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
