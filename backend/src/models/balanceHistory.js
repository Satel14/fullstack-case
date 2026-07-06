const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'balance_history',
    {
        history_id: {
            field: 'id',
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        history_userId: {
            field: 'userId',
            type: Sequelize.INTEGER,
        },
        history_type: {
            field: 'type',
            type: Sequelize.ENUM('payment', 'promocode', 'sellitem', 'opencase', 'bonus', 'sendmoney'),
        },
        history_change: {
            field: 'balanceChange',
            type: Sequelize.DECIMAL(12, 2),
        },
        history_extraData: {
            field: 'extraData',
            type: Sequelize.STRING,
        },
        created_at: {
            field: 'created_at',
            type: Sequelize.DATE,
        },
    },
    {
        timestamps: false,
    },
);
