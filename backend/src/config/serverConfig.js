const mode = process.env.NODE_ENV || 'development'
require('dotenv').config()

const config = {
    development: {
        database: {
            username: 'root',
            password: '1234',
            database: 'case',
            host: 'localhost',
            db_port: '3306',
        },
        port: '3003',
    },
    production: {
        database: {
            host: process.env.MYSQL_HOST_IP || 'mysql-db',
            db_port: '3306',
            database: 'case',
            username: 'fullstack',
            password: '1234',
        },
        port: process.env.SERVER_PORT,
    }
}

module.exports = config[mode];
