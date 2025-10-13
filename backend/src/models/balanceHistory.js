const Sequelize = require("sequelize")
const sequelize = require("../config/db")

module.exports = sequelize.define(
    "balanceHistory",
    {
        history_id: {
            field: "id",
            type: Sequelize.INTEGER,
            primaryKey: true,
        },
        history_userId: {
            field: "userId",
            type: Sequelize.INTEGER,
        },
        history_type: {
            field: "type",
            type: Sequelize.ENUM('payment', 'promocode', 'sellitem', 'opencase', 'bonus', 'sendmoney'),
        },
        history_change: {
            field: "balanceChange",
            type: Sequelize.INTEGER,
        },
        history_extraData: {
            field: "extraData",
            type: Sequelize.STRING,
        },
        create_at: {
            field: "created_at",
            type: Sequelize.DATE,
        },
    },
    {
        timestamps: false,
    }
);
