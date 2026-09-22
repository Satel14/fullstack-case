const AdminAction = require('../models/adminAction');

const MAX_LIMIT = 200;

module.exports.record = async (data, options = {}) => {
    await AdminAction.create(
        {
            admin_adminId: data.adminId,
            admin_action: data.action,
            admin_targetType: data.targetType,
            admin_targetId: String(data.targetId),
            admin_payload: data.payload === undefined ? null : JSON.stringify(data.payload),
            admin_reason: data.reason || null,
            created_at: new Date(),
        },
        options,
    );
};

module.exports.list = async ({ limit, offset } = {}) => {
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, MAX_LIMIT));
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

    const rows = await AdminAction.findAll({
        order: [['admin_id', 'DESC']],
        limit: safeLimit,
        offset: safeOffset,
    });

    return rows.map((r) => ({
        id: r.admin_id,
        adminId: r.admin_adminId,
        action: r.admin_action,
        targetType: r.admin_targetType,
        targetId: r.admin_targetId,
        payload: r.admin_payload ? JSON.parse(r.admin_payload) : null,
        reason: r.admin_reason,
        created_at: r.created_at,
    }));
};

module.exports.MAX_LIMIT = MAX_LIMIT;
