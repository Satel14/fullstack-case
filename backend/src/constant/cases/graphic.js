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
    { id: 1618, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1424, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 799, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 581, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1608, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1717, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 933, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1370, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1461, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1452, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1404, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 599, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1576, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 1212, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 635, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 431, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
