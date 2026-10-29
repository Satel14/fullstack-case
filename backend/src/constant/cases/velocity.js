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
    { id: 1214, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1317, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1545, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 670, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1034, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 32, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1131, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 563, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1163, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1140, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1364, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 966, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1158, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 874, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 974, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 294, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
