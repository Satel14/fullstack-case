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
    { id: 638, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 609, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 628, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 532, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 1687, rare: ITEMS_CONFIG.GRADE.MILSPEC, colors: allColors },
    { id: 564, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1431, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 470, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 487, rare: ITEMS_CONFIG.GRADE.RESTRICTED, colors: allColors },
    { id: 1316, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 944, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 549, rare: ITEMS_CONFIG.GRADE.CLASSIFIED, colors: allColors },
    { id: 852, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 1130, rare: ITEMS_CONFIG.GRADE.COVERT, colors: allColors },
    { id: 440, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
