const { DataTypes } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.addColumn('promocodes', 'active', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true });
        await queryInterface.addColumn('promocodes', 'expiresAt', { type: DataTypes.DATE, allowNull: true });
    },

    async down({ context: queryInterface }) {
        await queryInterface.removeColumn('promocodes', 'expiresAt');
        await queryInterface.removeColumn('promocodes', 'active');
    },
};
