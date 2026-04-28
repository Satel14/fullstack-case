const { check, validationResult, body } = require('express-validator');
const UserService = require('../services/user');
const StorageService = require('../services/storage');
const BalanceHistoryService = require('../services/balanceHistory');
const PromocodeService = require('../services/promocode');
const MESSAGE = require('../constant/responseMessages');
const BalanceHistoryEnum = require('../constant/enums/balance').BalanceHistory;
const BonusHistoryService = require('../services/bonusHistory');

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

        const balance = await UserService.getBalanceByUserId(user_id);

        if(money_count > balance){            
            return res.status(200).json({ status: 200, sended: false, message: MESSAGE.USER.MONEY_NOT_ENOUGH });
        }

        await UserService.incrementBalance(money_count, userIdTo);
        await UserService.decrementBalance(money_count, user_id);

        await BalanceHistoryService.addBalanceChange(
            user_id, BalanceHistoryEnum.SEND_MONEY, -money_count, 'Sended to userid ' + userIdTo
        );
        await BalanceHistoryService.addBalanceChange(
            userIdTo, BalanceHistoryEnum.SEND_MONEY, +money_count, 'Sended from userid ' + user_id
        );
        const actualBalance = balance-money_count;
        return res.status(200).json({ status: 200, sended: true, balance: actualBalance });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
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
        // Clean bonus history
        await BonusHistoryService.cleanBonusHistory(user_id);
        
        // Balance is default
        await BalanceHistoryService.cleanBalanceHistory(user_id);
        await UserService.resetBalance(user_id)   ;
        // Clean Storage
        await StorageService.cleanStorageUser(user_id);

        // Edit Rank Player
        await UserService.resetRank(user_id);

        // Clean Promocode history
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
                body('money_count').exists().isNumeric(),
            ];
        }
        default:
            break;
    }
};
