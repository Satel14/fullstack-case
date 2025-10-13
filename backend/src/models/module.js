const Sequelize = require('sequelize');
const sequlize = require('../config/db');

module.exports = sequlize.define(
    'modules',
    {
        param: {
            field: 'param',
            type: Sequelize.INTEGER,
            primaryKey: true,
        },
        status: {
            field: 'status',
            type: Sequelize.INTEGER,
        },
        extraData: {
            field: 'extraData',
            type: Sequelize.JSON,
        },
    },
    {
        timestamps: false,
    },
);
