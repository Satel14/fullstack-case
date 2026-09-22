const { Resend } = require('resend');

const FROM = process.env.RESEND_FROM || 'caseUA <onboarding@resend.dev>';

let client = null;

const isEnabled = () => Boolean(process.env.RESEND_API_KEY);

const getClient = () => {
    if (client === null) {
        client = new Resend(process.env.RESEND_API_KEY);
    }
    return client;
};

const send = (message, sentLog, failedLog) => {
    if (!isEnabled()) {
        console.warn(`[mail] "${message.subject}" not sent: RESEND_API_KEY is not set`);
        return;
    }
    getClient().emails.send({ from: FROM, ...message })
        .then((res) => console.log(sentLog, res))
        .catch((err) => console.error(failedLog, err.message));
};

if (!isEnabled()) {
    console.warn('[mail] RESEND_API_KEY is not set: emails are disabled and password recovery is unavailable');
}

module.exports = {
    isEnabled,
    userRegistered(mailTo, data) {
        send({
            to: mailTo,
            subject: 'Успішна реєстрація на сайті',
            html: `<h1>Вітаємо на caseUA!</h1>
                   <p>Ваша реєстрація успішна.</p>
                   <p><strong>Ваш логін:</strong> ${data.login}</p>`,
        }, 'Welcome email sent via Resend:', 'Failed to send Resend welcome email:');
    },
    passwordResetLink(mailTo, data) {
        send({
            to: mailTo,
            subject: 'Відновлення доступу',
            html: `<h1>Відновлення пароля</h1>
                   <p><strong>Ваш логін:</strong> ${data.login}</p>
                   <p>Щоб задати новий пароль, перейдіть за посиланням (діє ${data.minutes} хв):</p>
                   <p><a href="${data.link}">${data.link}</a></p>
                   <p>Якщо ви не просили змінити пароль, просто проігноруйте цей лист — ваш пароль не зміниться.</p>`,
        }, 'Recovery email sent via Resend:', 'Error sending recovery email:');
    },
};
