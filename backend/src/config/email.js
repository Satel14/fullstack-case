require("dotenv").config();

const config = {
    name: 'example',
    service: "smtp.gmail.com",
    port: 3003,
    secure: false, // true for 465, false for other ports
    logger: true,
    debug: true,
    secureConnection: true,
    auth: {
        user: 'ostaplvov@gmail.com',
        pass: 'tbgtqvzsxwrhjcng',
    },
    tls: {
        rejectUnauthorized: true,
    },
};

module.exports = config;
