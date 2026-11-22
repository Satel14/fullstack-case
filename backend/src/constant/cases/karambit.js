const ITEMS_CONFIG = require('../../constant/itemConfigs')

const allColors = [
    ITEMS_CONFIG.COLORS.DEFAULT,
    ITEMS_CONFIG.COLORS.PAINTED,
];

module.exports = {
    CHANCES: {
        [ITEMS_CONFIG.GRADE.SPECIAL]: 1,
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
    { id: 247, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 253, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 233, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 248, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 252, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 234, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 246, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 241, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 240, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 237, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 243, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 231, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 232, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 250, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 236, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 244, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 249, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 238, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 251, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 242, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 239, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 235, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 230, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 245, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
