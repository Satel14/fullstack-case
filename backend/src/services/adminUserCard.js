const sequelize = require('../config/db');
const UserService = require('./user');
const CaseService = require('./case');
const AdminActionService = require('./adminAction');
const BalanceHistory = require('../models/balanceHistory');
const CaseOpenRecord = require('../models/caseOpenRecord');
const Storage = require('../models/storage');
const BonusHistory = require('../models/bonusHistory');
const { STORAGE_STATUSES } = require('../constant/enums/storageStatus');
const MESSAGE = require('../constant/responseMessages');

const LIMIT = 50;
const PROFILE_FIELDS = ['user_id', 'user_login', 'user_email', 'user_role', 'user_balance', 'user_rank', 'user_avatar', 'user_receiveInfo', 'created_at'];

module.exports.get = async (userId) => {
    const user = await UserService.findUserById(userId, { attributes: PROFILE_FIELDS });
    if (!user) {
        throw new Error(MESSAGE.ADMIN.USER_NOT_EXIST);
    }

    const [history, opens, items, counts, bonuses, adminActions] = await Promise.all([
        BalanceHistory.findAll({
            attributes: ['history_id', 'history_type', 'history_change', 'history_extraData', 'created_at'],
            where: { history_userId: userId },
            order: [['history_id', 'DESC']],
            limit: LIMIT,
        }),
        CaseOpenRecord.findAll({
            attributes: ['co_id', 'co_caseId', 'co_resultItemId', 'co_resultColor', 'co_pricePaid', 'co_created_at'],
            where: { co_userId: userId },
            order: [['co_id', 'DESC']],
            limit: LIMIT,
        }),
        Storage.findAll({
            attributes: ['storage_id', 'storage_itemId', 'storage_color', 'storage_caseId', 'storage_status', 'created_at', 'updated_at'],
            where: { storage_userId: userId },
            order: [['storage_id', 'DESC']],
            limit: LIMIT,
        }),
        Storage.findAll({
            attributes: ['storage_status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: { storage_userId: userId },
            group: ['storage_status'],
            raw: true,
        }),
        BonusHistory.findAll({
            attributes: ['id', 'bonusId', 'created_at'],
            where: { userId },
            order: [['id', 'DESC']],
            limit: LIMIT,
        }),
        AdminActionService.list({ limit: LIMIT, targetType: 'user', targetId: userId }),
    ]);

    const caseIds = [...new Set([...opens.map((row) => row.co_caseId), ...items.map((row) => row.storage_caseId)].filter(Boolean))];
    const cases = await CaseService.getCasesByIds(caseIds);
    const titles = new Map(cases.map((row) => [row.case_id, row.case_title]));
    const inventoryCounts = Object.fromEntries(STORAGE_STATUSES.map((status) => [status, 0]));
    counts.forEach((row) => { inventoryCounts[row.storage_status] = Number(row.count); });

    return {
        profile: {
            id: user.user_id,
            login: user.user_login,
            email: user.user_email,
            role: user.user_role,
            balance: user.user_balance,
            rank: user.user_rank,
            avatar: user.user_avatar,
            receiveInfo: user.user_receiveInfo,
            created_at: user.created_at,
        },
        balanceHistory: history.map((row) => ({
            id: row.history_id, type: row.history_type, change: row.history_change,
            extraData: row.history_extraData, created_at: row.created_at,
        })),
        opens: opens.map((row) => ({
            id: row.co_id, caseId: row.co_caseId, caseTitle: titles.get(row.co_caseId) || null,
            itemId: row.co_resultItemId, color: row.co_resultColor,
            pricePaid: row.co_pricePaid, created_at: row.co_created_at,
        })),
        inventory: {
            counts: inventoryCounts,
            items: items.map((row) => ({
                id: row.storage_id, itemId: row.storage_itemId, color: row.storage_color,
                caseId: row.storage_caseId, caseTitle: titles.get(row.storage_caseId) || null,
                status: row.storage_status, created_at: row.created_at, updated_at: row.updated_at,
            })),
        },
        bonuses: bonuses.map((row) => ({ id: row.id, bonusId: row.bonusId, created_at: row.created_at })),
        adminActions,
    };
};
