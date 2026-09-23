const Promocode = require('../models/promocode');
const MESSAGE = require('../constant/responseMessages');

module.exports.usePromocode = async (code, userId, options = {}) => {
    try {
        const { transaction } = options;
        const data = await Promocode.findByPk(code, options);

        if (!data) {
            throw new Error(MESSAGE.PROMOCODE.NOT_EXIST);
        }
        const promo = data.dataValues;
        const bonus = Number(promo.promo_bonus);
        if (!Number.isFinite(bonus) || bonus <= 0 || !Number.isInteger(promo.promo_limit)) {
            throw new Error(MESSAGE.PROMOCODE.INVALID);
        }

        const usedIds = Array.isArray(promo.promo_used_ids)
            ? promo.promo_used_ids
            : JSON.parse(promo.promo_used_ids || '[]');
        if (usedIds.length >= promo.promo_limit) {
            throw new Error(MESSAGE.PROMOCODE.LIMIT_MAX);
        }

        if (usedIds.includes(userId)) {
            throw new Error(MESSAGE.PROMOCODE.USED_BY_YOURSELF);
        }

        usedIds.push(userId);
        await Promocode.update({ promo_used_ids: usedIds }, { where: { promo_code: code }, transaction });

        return { bonus, description: promo.promo_description };
    } catch (e) {
        throw Error(e.message);
    }
};