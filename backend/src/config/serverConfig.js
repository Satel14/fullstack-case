const mode = process.env.NODE_ENV || 'development'
require('dotenv').config()

const config = {
    development: {
        database: {
            username: 'root',
            password: '1234',
            database: 'case',
            host: 'localhost',
            db_port: '3006',
        },
        port: '3003',
    },
    production: {
        database: {
            host: 'localhost',
            db_port: '3306',
            database: 'case',
            username: 'root',
            password: '1234',
        },
        port: process.env.SERVER_PORT,
    }
}

module.exports = config[mode];
