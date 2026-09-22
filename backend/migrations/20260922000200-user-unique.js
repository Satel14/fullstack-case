const { DataTypes } = require('sequelize');

const assertNoDuplicates = async (queryInterface, column) => {
    const [rows] = await queryInterface.sequelize.query(
        `SELECT \`${column}\` AS value, COUNT(*) AS n FROM users `
        + `WHERE \`${column}\` IS NOT NULL GROUP BY \`${column}\` HAVING n > 1`,
    );
    if (rows.length > 0) {
        const values = rows.map((r) => `${r.value} (${r.n})`).join(', ');
        throw new Error(`Cannot add unique index: duplicate ${column} values present — ${values}`);
    }
};

module.exports = {
    async up({ context: queryInterface }) {
        await assertNoDuplicates(queryInterface, 'login');
        await assertNoDuplicates(queryInterface, 'email');

        const [tooLong] = await queryInterface.sequelize.query(
            'SELECT COUNT(*) AS n FROM users WHERE CHAR_LENGTH(email) > 255',
        );
        if (Number(tooLong[0].n) > 0) {
            throw new Error(`Cannot narrow email to VARCHAR(255): ${tooLong[0].n} row(s) exceed 255 characters`);
        }

        await queryInterface.changeColumn('users', 'email', { type: DataTypes.STRING });
        await queryInterface.addIndex('users', ['login'], { unique: true, name: 'users_login_unique' });
        await queryInterface.addIndex('users', ['email'], { unique: true, name: 'users_email_unique' });
    },

    async down({ context: queryInterface }) {
        await queryInterface.removeIndex('users', 'users_email_unique');
        await queryInterface.removeIndex('users', 'users_login_unique');
        await queryInterface.changeColumn('users', 'email', { type: DataTypes.TEXT });
    },
};
