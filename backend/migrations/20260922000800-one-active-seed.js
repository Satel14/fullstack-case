module.exports = {
    async up({ context: queryInterface }) {
        const { sequelize } = queryInterface;

        await sequelize.query(
            'UPDATE provably_fair_seeds s '
            + 'JOIN (SELECT userId, MAX(id) AS keepId FROM provably_fair_seeds '
            + "WHERE status = 'active' GROUP BY userId HAVING COUNT(*) > 1) d ON d.userId = s.userId "
            + "SET s.status = 'revealed', s.revealed_at = NOW() "
            + "WHERE s.status = 'active' AND s.id < d.keepId",
        );
        await sequelize.query(
            'ALTER TABLE provably_fair_seeds '
            + "ADD COLUMN activeUserId INT GENERATED ALWAYS AS (IF(status = 'active', userId, NULL)) STORED, "
            + 'ADD UNIQUE INDEX provably_fair_seeds_one_active (activeUserId)',
        );
    },

    async down({ context: queryInterface }) {
        await queryInterface.sequelize.query(
            'ALTER TABLE provably_fair_seeds DROP INDEX provably_fair_seeds_one_active, DROP COLUMN activeUserId',
        );
    },
};
