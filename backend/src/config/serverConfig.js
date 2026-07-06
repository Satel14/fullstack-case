const mode = process.env.NODE_ENV || 'development'
require('dotenv').config()

const config = {
    development: {
        database: {
            username: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '1234',
            database: process.env.DB_NAME || 'case',
            host: process.env.DB_HOST || 'localhost',
            db_port: process.env.DB_PORT || '3306',
        },
        port: process.env.SERVER_PORT || '3003',
    },
    production: {
        database: {
            host: process.env.MYSQL_HOST_IP || 'mysql-db',
            db_port: process.env.DB_PORT || '3306',
            database: process.env.PROD_DB_NAME || 'case',
            username: process.env.PROD_DB_USER || 'fullstack',
            password: process.env.PROD_DB_PASS,
        },
        port: process.env.SERVER_PORT,
    }
}

module.exports = config[mode];
