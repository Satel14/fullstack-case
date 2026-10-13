const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'email_verifications',
    {
        ev_id: { field: 'id', type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        ev_login: { field: 'login', type: Sequelize.STRING(32) },
        ev_email: { field: 'email', type: Sequelize.STRING(255) },
        ev_passwordHash: { field: 'passwordHash', type: Sequelize.STRING(255) },
        ev_avatar: { field: 'avatar', type: Sequelize.INTEGER },
        ev_tokenHash: { field: 'tokenHash', type: Sequelize.CHAR(64) },
        ev_expiresAt: { field: 'expiresAt', type: Sequelize.DATE },
        ev_usedAt: { field: 'usedAt', type: Sequelize.DATE },
        created_at: { field: 'created_at', type: Sequelize.DATE },
    },
    { freezeTableName: true, timestamps: false },
);
