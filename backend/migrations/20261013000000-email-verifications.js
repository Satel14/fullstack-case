const { DataTypes } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.createTable('email_verifications', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            login: { type: DataTypes.STRING(32), allowNull: false },
            email: { type: DataTypes.STRING(255), allowNull: false },
            passwordHash: { type: DataTypes.STRING(255), allowNull: false },
            avatar: { type: DataTypes.INTEGER, allowNull: false },
            tokenHash: { type: DataTypes.CHAR(64), allowNull: false },
            expiresAt: { type: DataTypes.DATE, allowNull: false },
            usedAt: { type: DataTypes.DATE, allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false },
        });
        await queryInterface.addIndex('email_verifications', ['tokenHash'], {
            name: 'email_verifications_token_hash',
            unique: true,
        });
        await queryInterface.addIndex('email_verifications', ['email'], {
            name: 'email_verifications_email',
        });
    },

    async down({ context: queryInterface }) {
        await queryInterface.dropTable('email_verifications');
    },
};
