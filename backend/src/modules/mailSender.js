const nodemailer = require('nodemailer');
const emailOptions = require('../config/email');

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_4zhginK1_Jgfj3wYJ4fq2z6BqzuGKNAjW');

module.exports = {
    userRegistered(mailTo, data) {
        resend.emails.send({
            from: 'caseUA <onboarding@resend.dev>',
            to: mailTo,
            subject: 'Успішна реєстрація на сайті',
            html: `<h1>Вітаємо на caseUA!</h1>
                   <p>Ваша реєстрація успішна.</p>
                   <p><strong>Ваш логін:</strong> ${data.login}</p>
                   <p><strong>Ваш пароль:</strong> ${data.password}</p>`,
        }).then((res) => console.log('Welcome email sent via Resend:', res))
            .catch(err => console.error('Failed to send Resend welcome email:', err.message));
    },
    forgotPassword(mailTo, data) {
        resend.emails.send({
            from: 'caseUA <onboarding@resend.dev>',
            to: mailTo,
            subject: 'Відновлення доступу',
            html: `<h1>Відновлення пароля</h1>
                   <p><strong>Ваш логін:</strong> ${data.login}</p>
                   <p><strong>Ваш пароль:</strong> ${data.password}</p>`,
        }).then((res) => console.log('Recovery email sent via Resend:', res))
            .catch((error) => console.error('Error sending recovery email:', error.message));
    }
}
