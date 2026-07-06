const { check, validationResult, body } = require('express-validator');
const UserService = require('../services/user');
const StorageService = require('../services/storage');
const BalanceHistoryService = require('../services/balanceHistory');
const PromocodeService = require('../services/promocode');
const MESSAGE = require('../constant/responseMessages');
const BalanceHistoryEnum = require('../constant/enums/balance').BalanceHistory;
const BonusHistoryService = require('../services/bonusHistory');
const sequelize = require('../config/db');

module.exports.getUserById = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { id } = req.params;
        const user = await UserService.getUserById(id);
        const openCaseHistory = await StorageService.getStorageLastItems(24);

        return res.status(200).json({ status: 200, data: user, openCaseHistory });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.sendMoneyForUserByUserId = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { user_id } = req.user.profile;
        const { userIdTo, money_count } = req.body;

        const amount = Number(money_count);

        if (!Number.isInteger(amount) || amount <= 0) {
            return res.status(422).json({ status: 422, sended: false, message: MESSAGE.VALIDATOR.ERROR });
        }

        if (Number(userIdTo) === Number(user_id)) {
            return res.status(422).json({ status: 422, sended: false, message: MESSAGE.VALIDATOR.ERROR });
        }

        const recipient = await UserService.getUserById(userIdTo).catch(() => null);
        if (!recipient) {
            return res.status(422).json({ status: 422, sended: false, message: MESSAGE.USER.NOT_EXIST });
        }

        await sequelize.transaction(async (t) => {
            const lockedBalance = await UserService.getBalanceByUserId(user_id, {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (amount > lockedBalance) {
                const err = new Error(MESSAGE.USER.MONEY_NOT_ENOUGH);
                err.code = 'MONEY_NOT_ENOUGH';
                throw err;
            }

            await UserService.incrementBalance(amount, userIdTo, { transaction: t });
            await UserService.decrementBalance(amount, user_id, { transaction: t });

            await BalanceHistoryService.addBalanceChange(
                user_id, BalanceHistoryEnum.SEND_MONEY, -amount, 'Sended to userid ' + userIdTo, { transaction: t }
            );
            await BalanceHistoryService.addBalanceChange(
                userIdTo, BalanceHistoryEnum.SEND_MONEY, +amount, 'Sended from userid ' + user_id, { transaction: t }
            );
        });

        const actualBalance = await UserService.getBalanceByUserId(user_id);
        return res.status(200).json({ status: 200, sended: true, balance: actualBalance });
    } catch (e) {
        if (e && e.code === 'MONEY_NOT_ENOUGH') {
            return res.status(200).json({ status: 200, sended: false, message: MESSAGE.USER.MONEY_NOT_ENOUGH });
        }
        return res.status(400).json({ status: 400, message: e.message });
    }
};


module.exports.depositBalance = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { user_id } = req.user.profile;
        const amount = Number(req.body.amount);

        if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        await sequelize.transaction(async (t) => {
            await UserService.incrementBalance(amount, user_id, { transaction: t });
            await BalanceHistoryService.addBalanceChange(
                user_id, BalanceHistoryEnum.PAYMENT, amount, 'Поповнення (симуляція ПС)', { transaction: t },
            );
        });

        const balance = await UserService.getBalanceByUserId(user_id);
        return res.status(200).json({ status: 200, balance });
    } catch (e) {
        return res.status(500).json({ status: 500, message: e.message });
    }
};

module.exports.getDepositHistory = async (req, res) => {
    try {
        const { user_id } = req.user.profile;
        const history = await BalanceHistoryService.getHistoryByUserAndType(
            user_id, BalanceHistoryEnum.PAYMENT,
        );
        return res.status(200).json({ status: 200, data: history });
    } catch (e) {
        return res.status(500).json({ status: 500, message: e.message });
    }
};

module.exports.editUserRankForOnline = async (req, res) => {
    try {
        const { user_id } = req.user.profile;
        const fiveMinutesBonusRank = 0.000001;

        await UserService.incrementRank(fiveMinutesBonusRank, user_id);
        return res.status(200).json({ status: 200 });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.editUser = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { user_id } = req.user.profile;
        await UserService.editUser(req.body, user_id);
        return res.status(200).json({ status: 200 });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.resetUser = async (req, res) => {
    try {
        const { user_id } = req.user.profile;
        await BonusHistoryService.cleanBonusHistory(user_id);
        
        await BalanceHistoryService.cleanBalanceHistory(user_id);
        await UserService.resetBalance(user_id)   ;
        await StorageService.cleanStorageUser(user_id);

        await UserService.resetRank(user_id);

        await PromocodeService.deleteUsedPromocodesOfUser(user_id);

        return res.status(200).json({ status: 200 });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'getUserById': {
            return [
                check('id').exists().isNumeric(),
            ];
        }
        case 'editUser': {
            return [
                body('user_avatar').isNumeric().optional({ nullable: true }),
                body('user_password').isString().optional({ nullable: true }),
            ];
        }
        case 'sendMoneyForUser': {
            return [
                body('userIdTo').exists().isNumeric(),
                body('money_count').exists().isInt({ gt: 0 }),
            ];
        }
        case 'deposit': {
            return [
                body('amount').exists().isInt({ gt: 0, lt: 100001 }),
            ];
        }
        default:
            break;
    }
};
