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
    { id: 822, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1485, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1413, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1764, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 755, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1006, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1070, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1538, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 847, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 573, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 607, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 887, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1066, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1062, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 977, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 177, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
