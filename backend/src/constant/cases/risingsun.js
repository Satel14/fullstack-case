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
    { id: 793, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1271, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 717, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1557, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1033, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 696, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1740, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 491, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1237, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1388, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 908, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1232, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1723, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1667, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 937, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 257, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
