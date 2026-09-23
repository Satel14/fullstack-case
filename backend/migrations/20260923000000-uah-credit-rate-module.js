const PARAM = 'uah-credit-rate';

module.exports = {
    async up({ context: queryInterface }) {
        const [rows] = await queryInterface.sequelize.query(
            'SELECT param FROM modules WHERE param = ?',
            { replacements: [PARAM] },
        );

        if (rows.length === 0) {
            await queryInterface.sequelize.query(
                'INSERT INTO modules (param, status, extraData) VALUES (?, 1, ?)',
                { replacements: [PARAM, '1'] },
            );
        }
    },

    async down({ context: queryInterface }) {
        await queryInterface.sequelize.query(
            'DELETE FROM modules WHERE param = ?',
            { replacements: [PARAM] },
        );
    },
};
