const { DataTypes } = require('sequelize');

const TABLE = 'bonus_history';
const UNIQUE_INDEX = 'bonus_history_user_id_bonus_id';
const LEGACY_INDEX = 'bonus_history_user_id';

const indexNames = async (queryInterface) => {
    const indexes = await queryInterface.showIndex(TABLE);
    return new Set(indexes.map((i) => i.name));
};

const hasAutoIncrement = async (queryInterface) => {
    const [rows] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM \`${TABLE}\` WHERE Field = 'id'`,
    );
    return rows.length > 0 && /auto_increment/i.test(rows[0].Extra || '');
};

module.exports = {
    async up({ context: queryInterface }) {
        const names = await indexNames(queryInterface);

        if (!names.has(UNIQUE_INDEX)) {
            await queryInterface.addIndex(TABLE, ['userId', 'bonusId'], {
                unique: true,
                name: UNIQUE_INDEX,
            });
        }
        if (names.has(LEGACY_INDEX)) {
            await queryInterface.removeIndex(TABLE, LEGACY_INDEX);
        }

        if (!await hasAutoIncrement(queryInterface)) {
            await queryInterface.changeColumn(TABLE, 'id', {
                type: DataTypes.INTEGER,
                allowNull: false,
                autoIncrement: true,
            });
        }
    },

    async down({ context: queryInterface }) {
        if (await hasAutoIncrement(queryInterface)) {
            await queryInterface.changeColumn(TABLE, 'id', {
                type: DataTypes.INTEGER,
                allowNull: false,
            });
        }

        const names = await indexNames(queryInterface);

        if (!names.has(LEGACY_INDEX)) {
            await queryInterface.addIndex(TABLE, ['userId'], { name: LEGACY_INDEX });
        }
        if (names.has(UNIQUE_INDEX)) {
            await queryInterface.removeIndex(TABLE, UNIQUE_INDEX);
        }
    },
};
