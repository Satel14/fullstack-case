const { DataTypes } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.createTable('upgrades', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            userId: { type: DataTypes.INTEGER, allowNull: false },
            seedId: { type: DataTypes.INTEGER, allowNull: false },
            serverSeedHash: { type: DataTypes.STRING(64), allowNull: false },
            clientSeed: { type: DataTypes.STRING(255), allowNull: false },
            nonce: { type: DataTypes.INTEGER, allowNull: false },
            stake: { type: DataTypes.TEXT, allowNull: false },
            stakeValue: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
            targetItemId: { type: DataTypes.INTEGER, allowNull: false },
            targetColor: { type: DataTypes.STRING(16), allowNull: false },
            targetPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
            threshold: { type: DataTypes.INTEGER, allowNull: false },
            roll: { type: DataTypes.INTEGER, allowNull: false },
            won: { type: DataTypes.BOOLEAN, allowNull: false },
            resultStorageId: { type: DataTypes.INTEGER, allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false },
        });
        await queryInterface.addIndex('upgrades', ['userId', 'id'], { name: 'upgrades_user_id_id' });
    },

    async down({ context: queryInterface }) {
        await queryInterface.dropTable('upgrades');
    },
};
