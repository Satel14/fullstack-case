const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'insider_prices',
    {
        id: {
            field: 'id',
            type: Sequelize.INTEGER,
        },
        name: {
            field: 'name',
            type: Sequelize.STRING,
            primaryKey: true,
        },
        pricesInCredits: {
            field: 'pricesInCredits',
            type: Sequelize.JSON,
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
