const { DataTypes } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.createTable('password_resets', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            userId: { type: DataTypes.INTEGER, allowNull: false },
            tokenHash: { type: DataTypes.CHAR(64), allowNull: false },
            expiresAt: { type: DataTypes.DATE, allowNull: false },
            usedAt: { type: DataTypes.DATE, allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false },
        });
        await queryInterface.addIndex('password_resets', ['tokenHash'], {
            name: 'password_resets_token_hash',
            unique: true,
        });
        await queryInterface.addIndex('password_resets', ['userId'], {
            name: 'password_resets_user_id',
        });
    },

    async down({ context: queryInterface }) {
        await queryInterface.dropTable('password_resets');
    },
};
