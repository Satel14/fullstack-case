const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'cases',
    {
        case_id: {
            field: 'id',
            type: Sequelize.STRING,
            primaryKey: true,
        },
        case_title: {
            field: 'title',
            type: Sequelize.STRING,
        },
        case_price: {
            field: 'price',
            type: Sequelize.INTEGER,
        },
        case_discount: {
            field: 'discount',
            type: Sequelize.INTEGER,
        },
        case_categoryId: {
            field: 'categoryId',
            type: Sequelize.INTEGER,
        },
        case_published: {
            field: 'published',
            type: Sequelize.INTEGER,
        },
        case_img: {
            field: 'img',
            type: Sequelize.TEXT,
        },
        case_openedCount: {
            field: 'openedCount',
            type: Sequelize.INTEGER,
        },
        case_openLimit: {
            field: 'openLimit',
            type: Sequelize.INTEGER,
        },
    },
    {
        timestamps: false,
    },
);
