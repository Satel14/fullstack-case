const { validationResult, body } = require('express-validator');
const BonusHistoryService = require('../services/bonusHistory');
const BonusService = require('../services/bonus');
const { findBonus } = require('../constant/bonuses');
const BalanceHistoryEnum = require('../constant/enums/balance').BalanceHistory;
const UserService = require('../services/user');
const BalanceHistoryService = require('../services/balanceHistory');
const MESSAGE = require('../constant/responseMessages');
const sequelize = require('../config/db');

const refuse = (res, message) => res.status(422).json({ status: 422, message });

const isDuplicateClaim = (e) => Boolean(e && (
    e.name === 'SequelizeUniqueConstraintError' || (e.original && e.original.code === 'ER_DUP_ENTRY')
));

module.exports.getBonusListOfUser = async (req, res) => {
    try {
        const data = await BonusService.stateFor(req.user.profile.user_id);
        return res.status(200).json({ status: 200, data });
    } catch (e) {
        return res.status(500).json({ status: 500, message: e.message });
    }
};

module.exports.activateBonus = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return refuse(res, MESSAGE.VALIDATOR.ERROR);
        }

        const { user_id } = req.user.profile;
        const bonus = findBonus(req.body.bonusId);

        if (!bonus) {
            return refuse(res, MESSAGE.BONUS.NOT_EXIST);
        }

        const now = new Date();

        await sequelize.transaction(async (t) => {
            await UserService.lockUsersInIdOrder([user_id], t);

            if (!(await BonusService.conditionMet(bonus, user_id, { transaction: t }))) {
                const err = new Error(MESSAGE.BONUS.NOT_AVAILABLE);
                err.code = 'NOT_AVAILABLE';
                throw err;
            }

            await BonusHistoryService.addBonusHistory(user_id, BonusService.claimKey(bonus, now), { transaction: t });
            await UserService.incrementBalance(bonus.amount, user_id, { transaction: t });
            await BalanceHistoryService.addBalanceChange(
                user_id, BalanceHistoryEnum.BONUS, bonus.amount, bonus.id, { transaction: t },
            );
        });

        const balance = await UserService.getBalanceByUserId(user_id);

        return res.status(200).json({ status: 200, balance, bonus: bonus.amount });
    } catch (e) {
        if (e && e.code === 'NOT_AVAILABLE') {
            return refuse(res, MESSAGE.BONUS.NOT_AVAILABLE);
        }
        if (isDuplicateClaim(e)) {
            return refuse(res, MESSAGE.BONUS.ALREADY_USED);
        }
        return res.status(500).json({ status: 500, message: e.message });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'activateBonus': {
            return [
                body('bonusId').exists().isString(),
            ];
        }
        default:
            break;
    }
};
