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
    { id: 1241, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 475, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1306, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 528, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 793, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1543, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1694, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1326, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1745, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1080, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1695, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 659, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 677, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1137, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 527, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 323, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
