const { DataTypes } = require('sequelize');

const WITHOUT = ['payment', 'promocode', 'sellitem', 'opencase', 'bonus', 'sendmoney', 'admin_adjust'];
const WITH_RESET = [...WITHOUT, 'reset'];

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.changeColumn('balance_history', 'type', {
            type: DataTypes.ENUM(...WITH_RESET),
        });
    },

    async down({ context: queryInterface }) {
        const [rows] = await queryInterface.sequelize.query(
            "SELECT COUNT(*) AS n FROM balance_history WHERE type = 'reset'",
        );
        if (Number(rows[0].n) > 0) {
            throw new Error(
                `Cannot remove reset: ${rows[0].n} balance_history row(s) still use it. `
                + 'Stop the application before reverting — this check is not atomic, and a row written '
                + 'during the revert would be silently invalidated.',
            );
        }
        await queryInterface.changeColumn('balance_history', 'type', {
            type: DataTypes.ENUM(...WITHOUT),
        });
    },
};
