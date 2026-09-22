const Sequelize = require("sequelize");
const config = require('./serverConfig')

module.exports = new Sequelize(
    config.database.database,
    config.database.username,
    config.database.password,
    {
        host: config.database.host,
        port: config.database.db_port,
        dialect: 'mysql',
        define: {
            freezeTableName: true,
        },
        logging: false,
    }
);

