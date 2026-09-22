const { DataTypes } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.addColumn('case_opens', 'drawTable', {
            type: DataTypes.TEXT,
            allowNull: true,
        });
    },

    async down({ context: queryInterface }) {
        await queryInterface.removeColumn('case_opens', 'drawTable');
    },
};
