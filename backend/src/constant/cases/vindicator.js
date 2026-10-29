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
    { id: 650, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1167, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 476, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1612, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1683, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1240, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1045, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 559, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1085, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1621, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 966, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1021, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1374, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1653, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 645, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 302, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
