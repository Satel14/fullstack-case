const Promocode = require('../models/promocode');
const MESSAGE = require('../constant/responseMessages');

module.exports.usePromocode = async (code, userId) => {
    try {
        const data = await Promocode.findByPk(code);

        if (!data) {
            throw new Error(MESSAGE.PROMOCODE.NOT_EXIST);
        }
        const promo = data.dataValues;
        const usedIds = JSON.parse(promo.promo_used_ids);
        if (usedIds.length >= promo.promo_limit) {
            throw new Error(MESSAGE.PROMOCODE.LIMIT_MAX);
        }

        if (usedIds.includes(userId)) {
            throw new Error(MESSAGE.PROMOCODE.USED_BY_YOURSELF);
        }

        usedIds.push(userId);
        await Promocode.update({ promo_used_ids: usedIds }, { where: { promo_code: code } });

        return { bonus: promo.promo_bonus, description: promo.promo_description };
    } catch (e) {
        throw Error(e.message);
    }
};


module.exports.deleteUsedPromocodesOfUser = async (userId) => {
    try {
        const data = await Promocode.findAll();
        const promises = [];
        // eslint-disable-next-line lodash/prefer-lodash-method
        data.forEach((element) => {
            let promo = element.dataValues;
            let code = promo.promo_code;

            const usedIds = JSON.parse(promo.promo_used_ids);
            if (usedIds.includes(userId)) {
                let filtered = usedIds.filter((id)=> id !== userId);
                promises.push(
                    Promocode.update({ promo_used_ids: filtered }, { where: { promo_code: code } })
                );
            }
        });

        await Promise.all(promises);

        return true;
    } catch (e) {
        throw Error(e.message);
    }
};