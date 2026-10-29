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
    { id: 990, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 13, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1420, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1543, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 43, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 619, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1656, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1388, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1532, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1514, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1116, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1373, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1768, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 925, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1212, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 192, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
