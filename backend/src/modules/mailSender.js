const nodemailer = require('nodemailer');
const emailOptions = require('../config/email');

const transporter = nodemailer.createTransport({
    name: emailOptions.name,
    service: emailOptions.service,
    port: emailOptions.port,
    secure: emailOptions.secure,
    logger: emailOptions.logger,
    debug: emailOptions.debug,
    secureConnection: emailOptions.secureConnection,
    auth: {
        email: emailOptions.auth.user,
        pass: emailOptions.auth.pass
    },
    tls: {
        rejectUnauthorized: emailOptions.tls.rejectUnauthorized,
    },
});

module.exports = {
    userRegistered(mailTo, data) {
        transporter.sendMail({
            from: '"Підтримка caseUA 👻" <ostaplvov@gmail.com>',
            to: mailTo,
            subject: 'Успішна реєстрація на сайті',
            text: `Ваш логін: ${data.login} ваш пароль: ${data.password}`,
            html: `Ваш логін: ${data.login} ваш пароль: ${data.password}`,
        });
    },
    forgotPassword(mailTo, data) {
        transporter.sendMail({
            from: '"Підтримка caseUA 👻" <ostaplvov@gmail.com>',
            to: mailTo,
            subject: 'Нагадуємо ваш логін і пароль',
            text: `Ваш логін: ${data.login} ваш пароль: ${data.password}`,
            html: `Ваш логін: ${data.login} ваш пароль: ${data.password}`,
        }).then(() => console.log('Email sent!'))
        .catch((error) => console.error('Error sending email:', error));
    }
}
