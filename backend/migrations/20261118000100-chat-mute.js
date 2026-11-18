const { DataTypes } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.addColumn('users', 'mutedUntil', { type: DataTypes.DATE, allowNull: true });
    },

    async down({ context: queryInterface }) {
        await queryInterface.removeColumn('users', 'mutedUntil');
    },
};
