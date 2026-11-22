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
    { id: 175, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 176, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 168, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 161, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 181, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 174, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 162, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 180, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 165, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 169, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 159, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 173, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 171, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 160, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 178, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 179, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 172, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 164, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 167, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 177, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 166, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 158, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 170, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    { id: 163, rare: ITEMS_CONFIG.GRADE.SPECIAL, colors: allColors },
    ],
};
