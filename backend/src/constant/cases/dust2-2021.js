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
    { id: 703, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1513, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 922, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1044, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1408, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1358, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 587, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 733, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 487, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1740, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1639, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1156, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1502, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 679, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1075, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 130, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
