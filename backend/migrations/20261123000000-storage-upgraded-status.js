const { DataTypes } = require('sequelize');

const WITHOUT = ['inventory', 'received', 'waitingtrade', 'money'];
const WITH_UPGRADED = [...WITHOUT, 'upgraded'];

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.changeColumn('storage', 'status', {
            type: DataTypes.ENUM(...WITH_UPGRADED),
            allowNull: true,
        });
    },

    async down({ context: queryInterface }) {
        const [rows] = await queryInterface.sequelize.query(
            "SELECT COUNT(*) AS n FROM storage WHERE status = 'upgraded'",
        );
        if (Number(rows[0].n) > 0) {
            throw new Error(
                `Cannot remove upgraded: ${rows[0].n} storage row(s) still use it. `
                + 'Stop the application before reverting — this check is not atomic, and a row written '
                + 'during the revert would be silently invalidated.',
            );
        }
        await queryInterface.changeColumn('storage', 'status', {
            type: DataTypes.ENUM(...WITHOUT),
            allowNull: true,
        });
    },
};
