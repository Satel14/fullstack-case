const { DataTypes } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.changeColumn('users', 'balance', {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
        });
        await queryInterface.changeColumn('users', 'rank', {
            type: DataTypes.DECIMAL(16, 6),
            defaultValue: 0,
        });
        await queryInterface.changeColumn('balance_history', 'balanceChange', {
            type: DataTypes.DECIMAL(12, 2),
        });
    },

    async down({ context: queryInterface }) {
        await queryInterface.changeColumn('users', 'balance', { type: DataTypes.DECIMAL(10, 0) });
        await queryInterface.changeColumn('users', 'rank', { type: DataTypes.DECIMAL(10, 0) });
        await queryInterface.changeColumn('balance_history', 'balanceChange', { type: DataTypes.INTEGER });
    },
};
