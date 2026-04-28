const { validationResult, body } = require('express-validator');
const UserService = require('../services/user');
const BalanceHistoryService = require('../services/balanceHistory');
const PromocodeService = require('../services/promocode');
const MESSAGE = require('../constant/responseMessages');
const BalanceHistoryEnum = require('../constant/enums/balance').BalanceHistory;

module.exports.usePromocode = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { user_id } = req.user.profile;
        const code = req.body.promocode;

        const { bonus, description } = await PromocodeService.usePromocode(code, user_id);
        await UserService.incrementBalance(bonus, user_id);
        await BalanceHistoryService.addBalanceChange(
            user_id, BalanceHistoryEnum.PROMOCODE, bonus,
        );

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
