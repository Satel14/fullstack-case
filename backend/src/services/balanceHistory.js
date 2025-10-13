const BalanceHistory = require('../models/balanceHistory');

module.exports.addBalanceChange = async (userId, type, change, extraData = '') => {
    try {
        const item = {
            history_userId: userId,
            history_type: type,
            history_change: change,
            history_extraData: extraData
        };
        await BalanceHistory.create(item);
        return;
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.cleanBalanceHistory = async (userId) => {
    try {
        await BalanceHistory.destroy({
            where: {
                history_userId: userId
            }
        })
        return;
    } catch (e) {
        throw Error(e.message);
    }
}