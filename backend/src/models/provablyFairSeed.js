const Sequelize = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define(
    'provably_fair_seeds',
    {
        pf_id: { field: 'id', type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        pf_userId: { field: 'userId', type: Sequelize.INTEGER },
        pf_serverSeed: { field: 'serverSeed', type: Sequelize.STRING },
        pf_serverSeedHash: { field: 'serverSeedHash', type: Sequelize.STRING },
        pf_clientSeed: { field: 'clientSeed', type: Sequelize.STRING },
        pf_nonce: { field: 'nonce', type: Sequelize.INTEGER, defaultValue: 0 },
        pf_status: { field: 'status', type: Sequelize.ENUM('active', 'revealed'), defaultValue: 'active' },
        pf_created_at: { field: 'created_at', type: Sequelize.DATE },
        pf_revealed_at: { field: 'revealed_at', type: Sequelize.DATE },
    },
    { timestamps: false },
);
