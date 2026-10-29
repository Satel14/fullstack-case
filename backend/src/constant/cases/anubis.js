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
    { id: 1236, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 678, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1043, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 519, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 41, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 836, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 934, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 639, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1008, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1710, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1436, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 533, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1642, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1733, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1212, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 80, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
