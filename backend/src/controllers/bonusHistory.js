const { validationResult, body } = require('express-validator');
const BonusHistoryService = require('../services/bonusHistory');
const ModuleService = require('../services/module');
const BalanceHistoryEnum = require('../constant/enums/balance').BalanceHistory;
const UserService = require('../services/user');
const BalanceHistoryService = require('../services/balanceHistory');
const MESSAGE = require('../constant/responseMessages');

module.exports.getBonusListOfUser = async (req, res) => {
    try {
        const { user_id } = req.user.profile;
        const list = await BonusHistoryService.getBonusHistory(user_id);
        return res.status(200).json({ status: 200, data: list });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.activateBonus = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { user_id } = req.user.profile;

        const { bonusId } = req.body;
        const usedBonusList = await BonusHistoryService.getBonusHistory(user_id);

        if (usedBonusList.includes(bonusId)) {
            return res.status(400).json({ status: 200, message: MESSAGE.BONUS.ALREADY_USED });
        }

        const moduleInfo = await ModuleService.getModuleById('bonusList');
        const json = JSON.parse(moduleInfo.extraData);

        if (!json[bonusId]) {
            return res.status(400).json({ status: 200, message: MESSAGE.BONUS.NOT_EXIST });
        }

        const bonusBalance = json[bonusId].bonus;
        await UserService.incrementBalance(bonusBalance, user_id);
        await BalanceHistoryService.addBalanceChange(
            user_id, BalanceHistoryEnum.BONUS, bonusBalance,
        );

        await BonusHistoryService.addBonusHistory(user_id, bonusId);
        return res.status(200).json({ status: 200 });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
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
