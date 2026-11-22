const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'upgrades',
    {
        up_id: { field: 'id', type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        up_userId: { field: 'userId', type: Sequelize.INTEGER, allowNull: false },
        up_seedId: { field: 'seedId', type: Sequelize.INTEGER, allowNull: false },
        up_serverSeedHash: { field: 'serverSeedHash', type: Sequelize.STRING(64), allowNull: false },
        up_clientSeed: { field: 'clientSeed', type: Sequelize.STRING(64), allowNull: false },
        up_nonce: { field: 'nonce', type: Sequelize.INTEGER, allowNull: false },
        up_stake: { field: 'stake', type: Sequelize.TEXT, allowNull: false },
        up_stakeValue: { field: 'stakeValue', type: Sequelize.DECIMAL(12, 2), allowNull: false },
        up_targetItemId: { field: 'targetItemId', type: Sequelize.INTEGER, allowNull: false },
        up_targetColor: { field: 'targetColor', type: Sequelize.STRING(16), allowNull: false },
        up_targetPrice: { field: 'targetPrice', type: Sequelize.DECIMAL(12, 2), allowNull: false },
        up_threshold: { field: 'threshold', type: Sequelize.INTEGER, allowNull: false },
        up_roll: { field: 'roll', type: Sequelize.INTEGER, allowNull: false },
        up_won: { field: 'won', type: Sequelize.BOOLEAN, allowNull: false },
        up_resultStorageId: { field: 'resultStorageId', type: Sequelize.INTEGER, allowNull: true },
        up_created_at: { field: 'created_at', type: Sequelize.DATE, allowNull: false },
    },
    { timestamps: false, freezeTableName: true },
);
