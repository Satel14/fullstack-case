process.env.DB_NAME = process.env.TEST_DB_NAME || 'case_test';

const mysql = require('mysql2/promise');
const config = require('../../src/config/serverConfig');
const sequelize = require('../../src/config/db');
const { createMigrator } = require('../../src/db/migrator');

const TEST_DB = process.env.DB_NAME;

const recreateDatabase = async () => {
    const connection = await mysql.createConnection({
        host: config.database.host,
        port: config.database.db_port,
        user: config.database.username,
        password: String(config.database.password),
    });
    await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
    await connection.query(`CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4`);
    await connection.end();
};

const resetTestDatabase = async () => {
    if (!/test/i.test(TEST_DB)) {
        throw new Error(`Refusing to reset "${TEST_DB}" — test database name must contain "test"`);
    }
    await recreateDatabase();
    await createMigrator(sequelize, { quiet: true }).up();
    return sequelize;
};

module.exports = { resetTestDatabase, TEST_DB };
