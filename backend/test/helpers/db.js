process.env.DB_NAME = process.env.TEST_DB_NAME || 'case_test';

const mysql = require('mysql2/promise');
const config = require('../../src/config/serverConfig');
const sequelize = require('../../src/config/db');
const { createMigrator } = require('../../src/db/migrator');

const TEST_DB = process.env.DB_NAME;

const assertSafeTestDatabase = () => {
    const connected = sequelize.config.database;

    if (connected !== TEST_DB) {
        throw new Error(
            `Refusing to reset "${TEST_DB}": the Sequelize connection is actually open on "${connected}". `
            + 'The integration suite only ever touches its own database. This happens when NODE_ENV=production, '
            + 'where serverConfig reads PROD_DB_NAME and ignores DB_NAME — run the suite with '
            + `NODE_ENV=development, or set PROD_DB_NAME=${TEST_DB}.`,
        );
    }

    if (!/test/i.test(connected)) {
        throw new Error(`Refusing to reset "${connected}" — a test database name must contain "test"`);
    }
};

const adminConnection = () => mysql.createConnection({
    host: config.database.host,
    port: config.database.db_port,
    user: config.database.username,
    password: String(config.database.password),
});

const recreateDatabase = async (name) => {
    const connection = await adminConnection();
    await connection.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await connection.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4`);
    await connection.end();
};

const recreateTestDatabase = async () => {
    assertSafeTestDatabase();
    await recreateDatabase(TEST_DB);
    return sequelize;
};

const recreateScratchDatabase = async (name) => {
    if (!/test/i.test(name)) {
        throw new Error(`Refusing to create scratch database "${name}" — the name must contain "test"`);
    }
    await recreateDatabase(name);
    return name;
};

const dropScratchDatabase = async (name) => {
    if (!/test/i.test(name)) {
        throw new Error(`Refusing to drop "${name}" — the name must contain "test"`);
    }
    const connection = await adminConnection();
    await connection.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await connection.end();
};

const resetTestDatabase = async () => {
    await recreateTestDatabase();
    await createMigrator(sequelize, { quiet: true }).up();
    return sequelize;
};

module.exports = {
    resetTestDatabase,
    recreateTestDatabase,
    recreateScratchDatabase,
    dropScratchDatabase,
    assertSafeTestDatabase,
    TEST_DB,
};
