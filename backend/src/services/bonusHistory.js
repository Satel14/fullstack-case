const BonusHistory = require('../models/bonusHistory');

module.exports.addBonusHistory = async (userId, bonusId) => {
    try {
        const item = {
            userId,
            bonusId,
        };
        await BonusHistory.create(item);
        return;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.cleanBonusHistory = async (userId) => {
    try {
        await BonusHistory.destroy({
            where: {
                userId
            }
        })
        return;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.getBonusHistory = async (userId) => {
    try {
        const history = await BonusHistory.findAll({
            where: {
                userId,
            },
        });
        const array = [];

        // eslint-disable-next-line lodash/prefer-lodash-method
        history.forEach((element) => {
            if (!array.includes(element.dataValues.bonusId)) {
                array.push(element.dataValues.bonusId);
            }
        });

        return array;
    } catch (e) {
        throw Error(e.message);
    }
};
