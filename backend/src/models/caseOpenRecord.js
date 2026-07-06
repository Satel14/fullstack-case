const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'case_opens',
    {
        co_id: { field: 'id', type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        co_userId: { field: 'userId', type: Sequelize.INTEGER },
        co_caseId: { field: 'caseId', type: Sequelize.STRING },
        co_seedId: { field: 'seedId', type: Sequelize.INTEGER },
        co_storageId: { field: 'storageId', type: Sequelize.INTEGER },
        co_serverSeedHash: { field: 'serverSeedHash', type: Sequelize.STRING },
        co_clientSeed: { field: 'clientSeed', type: Sequelize.STRING },
        co_nonce: { field: 'nonce', type: Sequelize.INTEGER },
        co_resultItemId: { field: 'resultItemId', type: Sequelize.INTEGER },
        co_resultColor: { field: 'resultColor', type: Sequelize.STRING },
        co_created_at: { field: 'created_at', type: Sequelize.DATE },
    },
    { timestamps: false },
);
