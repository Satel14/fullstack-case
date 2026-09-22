const { DataTypes } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.addColumn('users', 'tokenVersion', {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });
    },

    async down({ context: queryInterface }) {
        await queryInterface.removeColumn('users', 'tokenVersion');
    },
};
