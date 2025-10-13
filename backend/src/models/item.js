const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'items',
    {
        item_itemId: {
            field: 'itemId',
            type: Sequelize.INTEGER,
            primaryKey: true,
        },
        item_name: {
            field: 'name',
            type: Sequelize.STRING,
        },
        item_rare: {
            field: 'rare',
            type: Sequelize.STRING,
        },
        item_colors: {
            field: 'colors',
            type: Sequelize.STRING,
        },
        item_type: {
            field: 'type',
            type: Sequelize.STRING,
        },
    },
    {
        timestamps: false,
    },
);