const { DataTypes } = require('sequelize');

const OPENS_ALREADY_MADE = 'GREATEST(COALESCE(opens.made, 0), COALESCE(drops.made, 0))';

const COUNTERS = [
    { table: 'cases', column: 'openedCount', type: DataTypes.INTEGER, nullableDefault: undefined },
    { table: 'cases', column: 'openLimit', type: DataTypes.INTEGER, nullableDefault: undefined },
    { table: 'users', column: 'balance', type: DataTypes.DECIMAL(12, 2), nullableDefault: 0 },
    { table: 'users', column: 'rank', type: DataTypes.DECIMAL(16, 6), nullableDefault: 0 },
];

const resumeNullOpenedCounts = async (queryInterface) => {
    const [[{ nullCounters }]] = await queryInterface.sequelize.query(
        'SELECT COUNT(*) AS nullCounters FROM cases WHERE openedCount IS NULL',
    );
    if (Number(nullCounters) === 0) {
        return;
    }
    await queryInterface.sequelize.query(
        'UPDATE cases '
        + 'LEFT JOIN (SELECT caseId, COUNT(*) AS made FROM case_opens GROUP BY caseId) AS opens ON opens.caseId = cases.id '
        + 'LEFT JOIN (SELECT caseId, COUNT(*) AS made FROM storage GROUP BY caseId) AS drops ON drops.caseId = cases.id '
        + `SET cases.published = IF(cases.openLimit <> -1 AND ${OPENS_ALREADY_MADE} >= cases.openLimit, 0, cases.published), `
        + `cases.openedCount = ${OPENS_ALREADY_MADE} `
        + 'WHERE cases.openedCount IS NULL',
    );
};

module.exports = {
    async up({ context: queryInterface }) {
        await resumeNullOpenedCounts(queryInterface);
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
