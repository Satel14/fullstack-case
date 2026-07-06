const { validationResult, body } = require('express-validator');
const UserService = require('../services/user');
const BalanceHistoryService = require('../services/balanceHistory');
const PromocodeService = require('../services/promocode');
const MESSAGE = require('../constant/responseMessages');
const BalanceHistoryEnum = require('../constant/enums/balance').BalanceHistory;
const sequelize = require('../config/db');

module.exports.usePromocode = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { user_id } = req.user.profile;
        const code = req.body.promocode;

        let bonus;
        let description;
        await sequelize.transaction(async (t) => {
            const result = await PromocodeService.usePromocode(code, user_id, {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            bonus = result.bonus;
            description = result.description;

            await UserService.incrementBalance(bonus, user_id, { transaction: t });
            await BalanceHistoryService.addBalanceChange(
                user_id, BalanceHistoryEnum.PROMOCODE, bonus, '', { transaction: t },
            );
        });

        const actualBalance = await UserService.getBalanceByUserId(user_id);
        return res.status(200).json({ status: 200, balance: actualBalance, message: `${MESSAGE.PROMOCODE.ADDED} ${bonus} ₽. Описание бонуса: ${description}` });
    } catch (e) {
        return res.status(200).json({ status: 200, message: e.message });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'usePromocode': {
            return [
                body('promocode').isString().optional({ nullable: true }),
            ];
        }
        default:
            break;
    }
};
