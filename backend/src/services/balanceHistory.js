const BalanceHistory = require('../models/balanceHistory');

module.exports.addBalanceChange = async (userId, type, change, extraData = '', options = {}) => {
    try {
        const item = {
            history_userId: userId,
            history_type: type,
            history_change: change,
            history_extraData: extraData
        };
        await BalanceHistory.create(item, options);
        return;
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.getHistoryByUserAndType = async (userId, type) => {
    try {
        const rows = await BalanceHistory.findAll({
            where: {
                history_userId: userId,
                history_type: type,
            },
            order: [['history_id', 'DESC']],
        });
        return rows.map((row) => row.dataValues);
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