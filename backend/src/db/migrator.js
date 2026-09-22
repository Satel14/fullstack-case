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

module.exports = { createMigrator, MIGRATIONS_DIR };
