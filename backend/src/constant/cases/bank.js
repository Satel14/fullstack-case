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
    { id: 822, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 850, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1016, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1101, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1490, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1014, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 842, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 552, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1457, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1598, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1506, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 459, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1637, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 749, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 772, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 371, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
