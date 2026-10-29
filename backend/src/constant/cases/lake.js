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
    { id: 1713, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1769, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 615, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 834, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 840, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 734, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1279, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1230, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 968, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1759, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1347, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 505, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1404, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 849, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 667, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 140, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
