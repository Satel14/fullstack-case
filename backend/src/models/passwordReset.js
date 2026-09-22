const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'password_resets',
    {
        reset_id: { field: 'id', type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        reset_userId: { field: 'userId', type: Sequelize.INTEGER },
        reset_tokenHash: { field: 'tokenHash', type: Sequelize.CHAR(64) },
        reset_expiresAt: { field: 'expiresAt', type: Sequelize.DATE },
        reset_usedAt: { field: 'usedAt', type: Sequelize.DATE },
        created_at: { field: 'created_at', type: Sequelize.DATE },
    },
    { freezeTableName: true, timestamps: false },
);
