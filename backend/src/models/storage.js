const Sequelize = require("sequelize")
const sequelize = require("../config/db")
const Users = require("./user")

module.exports = sequelize.define(
    'storage',
    {
        storage_id: {
            field: 'id',
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        storage_userId: {
            field: 'userId',
            type: Sequelize.INTEGER,
        },
        storage_itemId: {
            field: 'itemId',
            type: Sequelize.INTEGER,
        },
        storage_color: {
            field: 'color',
            type: Sequelize.STRING,
        },
        storage_caseId: {
            field: 'caseId',
            type: Sequelize.STRING,
        },
        storage_extraData: {
            field: 'extraData',
            type: Sequelize.TEXT,
        },
        storage_status: {
            field: 'status',
            type: Sequelize.ENUM('inventory', 'received', 'waitingtrade', 'money'),
            defaultValue: 'inventory',
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
