const { DataTypes } = require('sequelize');

const OPENS_ALREADY_MADE = 'GREATEST('
    + '(SELECT COUNT(*) FROM case_opens WHERE case_opens.caseId = cases.id), '
    + '(SELECT COUNT(*) FROM storage WHERE storage.caseId = cases.id))';

const COUNTERS = [
    {
        table: 'cases', column: 'openedCount', type: DataTypes.INTEGER, nullableDefault: undefined, filledWith: OPENS_ALREADY_MADE,
    },
    {
        table: 'cases', column: 'openLimit', type: DataTypes.INTEGER, nullableDefault: undefined, filledWith: '0',
    },
    {
        table: 'users', column: 'balance', type: DataTypes.DECIMAL(12, 2), nullableDefault: 0, filledWith: '0',
    },
    {
        table: 'users', column: 'rank', type: DataTypes.DECIMAL(16, 6), nullableDefault: 0, filledWith: '0',
    },
];

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.sequelize.query(
            `UPDATE cases SET published = 0 WHERE openedCount IS NULL AND openLimit <> -1 AND ${OPENS_ALREADY_MADE} >= openLimit`,
        );
        for (const {
            table, column, type, filledWith,
        } of COUNTERS) {
            await queryInterface.sequelize.query(`UPDATE \`${table}\` SET \`${column}\` = ${filledWith} WHERE \`${column}\` IS NULL`);
            await queryInterface.changeColumn(table, column, { type, allowNull: false, defaultValue: 0 });
        }
    },

    async down({ context: queryInterface }) {
        for (const { table, column, type, nullableDefault } of COUNTERS) {
            await queryInterface.changeColumn(table, column, { type, allowNull: true, defaultValue: nullableDefault });
        }
    },
};
