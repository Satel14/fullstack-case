const { DataTypes } = require('sequelize');

const TABLES = ['storage', 'balance_history', 'bonus_history'];

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.addColumn('case_opens', 'pricePaid', { type: DataTypes.DECIMAL(12, 2), allowNull: true });
        for (const table of TABLES) {
            await queryInterface.addIndex(table, ['userId', 'id'], { name: `${table}_user_id_id` });
        }
    },

    async down({ context: queryInterface }) {
        for (const table of TABLES) {
            await queryInterface.removeIndex(table, `${table}_user_id_id`);
        }
        await queryInterface.removeColumn('case_opens', 'pricePaid');
    },
};
