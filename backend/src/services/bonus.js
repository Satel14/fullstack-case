const { BONUSES } = require('../constant/bonuses');
const BonusHistoryService = require('./bonusHistory');
const UserService = require('./user');
const Storage = require('../models/storage');
const CaseOpenRecord = require('../models/caseOpenRecord');

const KYIV_DAY = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit',
});

const kyivDay = (date) => KYIV_DAY.format(date);

const claimKey = (bonus, now) => (bonus.kind === 'daily' ? `daily:${kyivDay(now)}` : bonus.id);

const CONDITIONS = {
    'receive-info': async (userId, options) => {
        const user = await UserService.getUserFullInfoById(userId, options);
        return Boolean(user && user.user_receiveInfo && String(user.user_receiveInfo).trim());
    },
    'first-case': async (userId, options) => (
        await CaseOpenRecord.count({ where: { co_userId: userId }, ...options })
    ) > 0,
    'first-withdrawal': async (userId, options) => (
        await Storage.count({ where: { storage_userId: userId, storage_status: 'received' }, ...options })
    ) > 0,
};

const conditionMet = async (bonus, userId, options = {}) => {
    const condition = CONDITIONS[bonus.id];
    return condition ? condition(userId, options) : true;
};

const stateFor = async (userId, now = new Date()) => {
    const claimed = new Set(await BonusHistoryService.getBonusHistory(userId));
    return Promise.all(BONUSES.map(async (bonus) => {
        const isClaimed = claimed.has(claimKey(bonus, now));
        return {
            id: bonus.id,
            kind: bonus.kind,
            amount: bonus.amount,
            claimed: isClaimed,
            available: !isClaimed && await conditionMet(bonus, userId),
        };
    }));
};

module.exports = {
    kyivDay, claimKey, conditionMet, stateFor,
};
