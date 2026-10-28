const { DataTypes } = require('sequelize');

const TABLE = 'items';
const COLUMN = 'grade';

const hasColumn = async (queryInterface) => Object.hasOwn(await queryInterface.describeTable(TABLE), COLUMN);

module.exports = {
    async up({ context: queryInterface }) {
        if (!(await hasColumn(queryInterface))) {
            await queryInterface.addColumn(TABLE, COLUMN, { type: DataTypes.STRING(16), allowNull: true });
        }
    },

    async down({ context: queryInterface }) {
        if (await hasColumn(queryInterface)) {
            await queryInterface.removeColumn(TABLE, COLUMN);
        }
    },
};
