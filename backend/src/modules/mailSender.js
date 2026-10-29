const { Resend } = require('resend');

const SITE_NAME = 'CASES.UA';
const FROM = process.env.RESEND_FROM || `${SITE_NAME} <onboarding@resend.dev>`;

let client = null;

const isEnabled = () => Boolean(process.env.RESEND_API_KEY);

const getClient = () => {
    if (client === null) {
        client = new Resend(process.env.RESEND_API_KEY);
    }
    return client;
};

const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const welcomeEmail = (data) => ({
    subject: `Успішна реєстрація на ${SITE_NAME}`,
    html: `<h1>Вітаємо на ${SITE_NAME}!</h1>
           <p>Ваша реєстрація успішна.</p>
           <p><strong>Ваш логін:</strong> ${escapeHtml(data.login)}</p>`,
});

const passwordResetEmail = (data) => {
    const link = escapeHtml(data.link);
    return {
        subject: `Відновлення доступу до ${SITE_NAME}`,
        html: `<h1>Відновлення пароля</h1>
               <p><strong>Ваш логін:</strong> ${escapeHtml(data.login)}</p>
               <p>Щоб задати новий пароль, перейдіть за посиланням (діє ${escapeHtml(data.minutes)} хв):</p>
               <p><a href="${link}">${link}</a></p>
               <p>Якщо ви не просили змінити пароль, просто проігноруйте цей лист — ваш пароль не зміниться.</p>`,
    };
};

const emailConfirmationEmail = (data) => {
    const link = escapeHtml(data.link);
    return {
        subject: `Підтвердження пошти на ${SITE_NAME}`,
        html: `<h1>Підтвердіть пошту</h1>
               <p><strong>Ваш логін:</strong> ${escapeHtml(data.login)}</p>
               <p>Щоб завершити реєстрацію, перейдіть за посиланням (діє ${escapeHtml(data.hours)} год):</p>
               <p><a href="${link}">${link}</a></p>
               <p>Якщо ви не реєструвалися на ${SITE_NAME}, просто проігноруйте цей лист — акаунт не буде створено.</p>`,
    };
};

const registrationAttemptEmail = (data) => ({
    subject: `Спроба реєстрації на ${SITE_NAME} з вашою поштою`,
    html: `<h1>Хтось намагався зареєструватися з вашою поштою</h1>
           <p>На цю адресу вже зареєстровано акаунт <strong>${escapeHtml(data.login)}</strong>.</p>
           <p>Якщо це були ви — просто увійдіть або відновіть пароль на сторінці входу.</p>
           <p>Якщо ні — нічого робити не треба, ваш акаунт не змінився.</p>`,
});

const send = (mailTo, message, failedLog) => {
    if (!isEnabled()) {
        return;
    }
    getClient().emails.send({ from: FROM, to: mailTo, ...message })
        .then(({ error }) => {
            if (error) {
                console.error(failedLog, error.message);
            }
        })
        .catch((err) => console.error(failedLog, err.message));
};

const senderDomain = (from) => {
    const match = /@([^\s<>@]+)>?\s*$/.exec(from);
    return match ? match[1].toLowerCase() : '';
};

if (!isEnabled()) {
    console.warn('[mail] RESEND_API_KEY is not set: emails are disabled, password recovery is unavailable and registration signs in without confirming the email');
} else if (senderDomain(FROM) === 'resend.dev') {
    console.warn(`[mail] the sender ${FROM} is on resend.dev, Resend's testing domain, which delivers only to the Resend account owner: registration confirmations and reset links to any other address will not arrive. Verify a sending domain in Resend and set RESEND_FROM to an address on it`);
}

module.exports = {
    isEnabled,
    welcomeEmail,
    passwordResetEmail,
    emailConfirmationEmail,
    registrationAttemptEmail,
    userRegistered(mailTo, data) {
        send(mailTo, welcomeEmail(data), '[mail] welcome email not sent:');
    },
    passwordResetLink(mailTo, data) {
        send(mailTo, passwordResetEmail(data), '[mail] recovery email not sent:');
    },
    emailConfirmationLink(mailTo, data) {
        send(mailTo, emailConfirmationEmail(data), '[mail] confirmation email not sent:');
    },
    registrationAttemptNotice(mailTo, data) {
        send(mailTo, registrationAttemptEmail(data), '[mail] registration attempt notice not sent:');
    },
};
