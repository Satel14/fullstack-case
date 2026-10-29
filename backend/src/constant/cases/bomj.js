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
    { id: 1220, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 853, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1359, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1742, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1510, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1590, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 673, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1345, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1163, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1461, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 758, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1451, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1644, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 530, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1646, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 350, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
