const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'bonus_history',
    {
        id: {
            field: 'id',
            type: Sequelize.INTEGER,
            primaryKey: true,
        },
        userId: {
            field: 'userId',
            type: Sequelize.INTEGER,
        },
        bonusId: {
            field: 'bonusId',
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
