const fs = require('fs');
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

const knownMigrationNames = () => fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js'));

const assertMigrationsApplied = async (sequelize) => {
    const migrator = createMigrator(sequelize, { quiet: true });
    const known = new Set(knownMigrationNames());

    const recorded = await migrator.storage.executed({ context: sequelize.getQueryInterface() });
    const unknown = recorded.filter((name) => !known.has(name));
    if (unknown.length > 0) {
        throw new Error(
            `Database has ${unknown.length} migration(s) this build does not know about: ${unknown.join(', ')}. `
            + 'Deploy a newer build or revert the database.',
        );
    }

    const pending = await migrator.pending();
    if (pending.length > 0) {
        const names = pending.map((m) => m.name).join(', ');
        throw new Error(`Database has ${pending.length} pending migration(s): ${names}. Run "npm run migrate".`);
    }
};

module.exports = {
    createMigrator, assertMigrationsApplied, knownMigrationNames, MIGRATIONS_DIR,
};
