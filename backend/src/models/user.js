const Sequelize = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define(
    "users",
    {
        user_id: {
            field: "id",
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_login: {
            field: "login",
            type: Sequelize.STRING,
        },
        user_password: {
            field: "password",
            type: Sequelize.STRING,
        },
        user_email: {
            field: "email",
            type: Sequelize.TEXT,
        },
        user_avatar: {
            field: "avatar",
            type: Sequelize.INTEGER,
        },
        user_balance: {
            field: "balance",
            type: Sequelize.DECIMAL(12, 2),
        },
        user_rank: {
            field: "rank",
            type: Sequelize.DECIMAL(16, 6),
        },
        user_receiveInfo: {
            field: "receiveInfo",
            type: Sequelize.TEXT,
        },
        user_role: {
            field: "role",
            type: Sequelize.INTEGER,
            defaultValue: 1,
        },
        created_at: {
            field: "created_at",
            type: Sequelize.DATE,
        },
        updated_at: {
            field: "updated_at",
            type: Sequelize.DATE,
        },
    },
    {
        timestamps: false,
    }
);
