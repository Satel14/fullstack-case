const nodemailer = require('nodemailer');
const emailOptions = require('../config/email');

const transporter = nodemailer.createTransport({
    service: emailOptions.service,
    auth: {
        email: emailOptions.auth.user,
        pass: emailOptions.auth.pass
    }
});

module.exports = {
    userRegistered(mailTo, data) {
        transporter.sendMail({
            from: 'підтримка caseUA 👻',
            to: mailTo,
            subject: 'Успішна реєстрація на сайті',
            text: `Ваш логін: ${data.login} ваш пароль: ${data.password}`,
            html: `Ваш логін: ${data.login} ваш пароль: ${data.password}`,
        });
    },
}
