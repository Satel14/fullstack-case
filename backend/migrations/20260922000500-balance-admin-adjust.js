const { DataTypes } = require('sequelize');

const WITHOUT = ['payment', 'promocode', 'sellitem', 'opencase', 'bonus', 'sendmoney'];
const WITH_ADJUST = [...WITHOUT, 'admin_adjust'];

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.changeColumn('balance_history', 'type', {
            type: DataTypes.ENUM(...WITH_ADJUST),
        });
    },

    async down({ context: queryInterface }) {
        const [rows] = await queryInterface.sequelize.query(
            "SELECT COUNT(*) AS n FROM balance_history WHERE type = 'admin_adjust'",
        );
        if (Number(rows[0].n) > 0) {
            throw new Error(
                `Cannot remove admin_adjust: ${rows[0].n} balance_history row(s) still use it`,
            );
        }
        await queryInterface.changeColumn('balance_history', 'type', {
            type: DataTypes.ENUM(...WITHOUT),
        });
    },
};
