const Sequelize = require("sequelize")
const sequelize = require("../config/db")

module.exports = sequelize.define(
    'categories',
    {
        category_id: {
            field: 'id',
            type: Sequelize.INTEGER,
            primaryKey: true,
        },
        category_title: {
            field: 'title',
            type: Sequelize.STRING,
        },
        category_slug: {
            field: 'slug',
            type: Sequelize.STRING(32),
            allowNull: true,
        },
        category_published: {
            field: 'published',
            type: Sequelize.INTEGER,
        },
        category_priority: {
            field: 'priority',
            type: Sequelize.INTEGER,
        },
        category_titleHelp: {
            field: 'titleHelp',
            type: Sequelize.TEXT,
        },
    },
    {
        timestamps: false,
    },
);
