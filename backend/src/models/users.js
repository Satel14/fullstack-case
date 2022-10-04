const Sequelize = require("sequelize")
const sequelize = require("../config/db")

module.exports = sequelize.define("users",
    {
        user_id: {
            field: "id",
            type: Sequelize.INTEGER,
            primaryKey: true,
        },
        user_login: {
            field: "login",
            type: Sequelize.STRING,
        },
        user_pass: {
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
        created_at: {
            field: "created_at",
            type: Sequelize.DATE,
        },
        update_at: {
            field: "update_at",
            type: Sequelize.DATE,
        },
    },
    {
        timestamps: false,
    }
);