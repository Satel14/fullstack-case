const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'promocodes',
    {
        promo_code: {
            field: 'code',
            type: Sequelize.STRING,
            primaryKey: true,
        },
        promo_description: {
            field: 'description',
            type: Sequelize.TEXT,
        },
        promo_bonus: {
            field: 'bonus',
            type: Sequelize.TEXT,
        },
        promo_used_ids: {
            field: 'used_ids',
            type: Sequelize.JSON,
        },
        promo_limit: {
            field: 'limit',
            type: Sequelize.INTEGER,
        },
        promo_active: {
            field: 'active',
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        promo_expiresAt: {
            field: 'expiresAt',
            type: Sequelize.DATE,
        },
        created_at: {
            field: 'created_at',
            type: Sequelize.DATE,
        },
        updated_at: {
            field: 'updated_at',
            type: Sequelize.DATE,
        },
    },
    {
        timestamps: false,
    },
);
