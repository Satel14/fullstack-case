const { DataTypes } = require('sequelize');

const COUNTERS = [
    { table: 'cases', column: 'openedCount', type: DataTypes.INTEGER, nullableDefault: undefined },
    { table: 'cases', column: 'openLimit', type: DataTypes.INTEGER, nullableDefault: undefined },
    { table: 'users', column: 'balance', type: DataTypes.DECIMAL(12, 2), nullableDefault: 0 },
    { table: 'users', column: 'rank', type: DataTypes.DECIMAL(16, 6), nullableDefault: 0 },
];

module.exports = {
    async up({ context: queryInterface }) {
        for (const { table, column, type } of COUNTERS) {
            await queryInterface.sequelize.query(`UPDATE \`${table}\` SET \`${column}\` = 0 WHERE \`${column}\` IS NULL`);
            await queryInterface.changeColumn(table, column, { type, allowNull: false, defaultValue: 0 });
        }
    },

    async down({ context: queryInterface }) {
        for (const { table, column, type, nullableDefault } of COUNTERS) {
            await queryInterface.changeColumn(table, column, { type, allowNull: true, defaultValue: nullableDefault });
        }
    },
};
