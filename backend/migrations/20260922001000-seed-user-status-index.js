module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.addIndex('provably_fair_seeds', ['userId', 'status'], {
            name: 'provably_fair_seeds_user_status',
        });
    },

    async down({ context: queryInterface }) {
        await queryInterface.removeIndex('provably_fair_seeds', 'provably_fair_seeds_user_status');
    },
};
