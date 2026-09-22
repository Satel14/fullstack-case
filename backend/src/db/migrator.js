const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

const createMigrator = (sequelize, { quiet = false } = {}) => new Umzug({
    migrations: {
        glob: ['*.js', { cwd: MIGRATIONS_DIR }],
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: quiet ? undefined : console,
});

const assertMigrationsApplied = async (sequelize) => {
    const pending = await createMigrator(sequelize, { quiet: true }).pending();
    if (pending.length > 0) {
        const names = pending.map((m) => m.name).join(', ');
        throw new Error(`Database has ${pending.length} pending migration(s): ${names}. Run "npm run migrate".`);
    }
};

module.exports = { createMigrator, assertMigrationsApplied, MIGRATIONS_DIR };
