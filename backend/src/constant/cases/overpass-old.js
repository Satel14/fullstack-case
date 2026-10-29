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
    { id: 1545, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1220, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1550, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1317, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1157, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1304, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1693, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1548, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1045, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1418, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1404, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 658, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 730, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 894, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1093, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 302, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
