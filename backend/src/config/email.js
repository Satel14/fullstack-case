require("dotenv").config();

const config = {
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_LOGIN,
        pass: process.env.EMAIL_PASS,
    },
};

module.exports = config;
