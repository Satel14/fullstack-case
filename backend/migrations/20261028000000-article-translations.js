const { DataTypes } = require('sequelize');

const TABLE = 'articles';
const COLUMNS = ['titleEn', 'textEn'];

const existingColumns = async (queryInterface) => new Set(Object.keys(await queryInterface.describeTable(TABLE)));

module.exports = {
    async up({ context: queryInterface }) {
        for (const column of COLUMNS) {
            // eslint-disable-next-line no-await-in-loop
            if (!(await existingColumns(queryInterface)).has(column)) {
                // eslint-disable-next-line no-await-in-loop
                await queryInterface.addColumn(TABLE, column, { type: DataTypes.TEXT, allowNull: true });
            }
        }
    },

    async down({ context: queryInterface }) {
        for (const column of COLUMNS) {
            // eslint-disable-next-line no-await-in-loop
            if ((await existingColumns(queryInterface)).has(column)) {
                // eslint-disable-next-line no-await-in-loop
                await queryInterface.removeColumn(TABLE, column);
            }
        }
    },
};
