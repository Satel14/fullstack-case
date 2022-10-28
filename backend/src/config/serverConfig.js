const mode = process.env.NODE_ENV || "development"

const config = {
    development: {
        username: "admin",
        password: "1234",
        database: "case",
        host: "localhost",
        port: "3003",
    },
    production: {
        username: "db_user_name",
        password: "db_user_password",
        database: "db_name",
        host: "127.0.0.1",
        port: "3003"
    }
}

module.exports = config[mode];