const { DataTypes } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.createTable('admin_actions', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            adminId: { type: DataTypes.INTEGER, allowNull: false },
            action: { type: DataTypes.STRING(64), allowNull: false },
            targetType: { type: DataTypes.STRING(32), allowNull: false },
            targetId: { type: DataTypes.STRING(64), allowNull: false },
            payload: { type: DataTypes.TEXT },
            reason: { type: DataTypes.STRING(255) },
            created_at: { type: DataTypes.DATE, allowNull: false },
        });
        await queryInterface.addIndex('admin_actions', ['adminId', 'created_at'], {
            name: 'admin_actions_admin_id_created_at',
        });
        await queryInterface.addIndex('admin_actions', ['targetType', 'targetId'], {
            name: 'admin_actions_target_type_target_id',
        });
    },

    async down({ context: queryInterface }) {
        await queryInterface.dropTable('admin_actions');
    },
};
