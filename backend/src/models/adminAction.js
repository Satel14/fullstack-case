const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'admin_actions',
    {
        admin_id: { field: 'id', type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        admin_adminId: { field: 'adminId', type: Sequelize.INTEGER },
        admin_action: { field: 'action', type: Sequelize.STRING(64) },
        admin_targetType: { field: 'targetType', type: Sequelize.STRING(32) },
        admin_targetId: { field: 'targetId', type: Sequelize.STRING(64) },
        admin_payload: { field: 'payload', type: Sequelize.TEXT },
        admin_reason: { field: 'reason', type: Sequelize.STRING(255) },
        created_at: { field: 'created_at', type: Sequelize.DATE },
    },
    { timestamps: false },
);
