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
    { id: 589, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1609, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 528, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1016, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 710, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1449, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1572, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 488, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 782, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 485, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1373, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 966, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 887, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 925, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 903, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 440, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
