const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'articles',
    {
        article_id: {
            field: 'id',
            type: Sequelize.INTEGER,
            primaryKey: true,
        },
        article_title: {
            field: 'title',
            type: Sequelize.TEXT,
        },
        article_text: {
            field: 'text',
            type: Sequelize.TEXT,
        },
        article_views: {
            field: 'views',
            type: Sequelize.INTEGER,
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