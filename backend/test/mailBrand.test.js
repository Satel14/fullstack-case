const test = require('node:test');
const assert = require('node:assert');
const mail = require('../src/modules/mailSender');
const { MONEY, russianWordsIn } = require('./helpers/ukrainian');

test('every letter names the site as CASES.UA', () => {
    const letters = [
        mail.welcomeEmail({ login: 'player' }),
        mail.passwordResetEmail({ login: 'player', link: 'http://host/reset-password?token=abc', minutes: 30 }),
        mail.emailConfirmationEmail({ login: 'player', link: 'http://host/confirm-email?token=abc', hours: 24 }),
        mail.registrationAttemptEmail({ login: 'player' }),
    ];

    letters.forEach((letter) => {
        assert.match(`${letter.subject} ${letter.html}`, /CASES\.UA/, letter.subject);
        assert.doesNotMatch(`${letter.subject} ${letter.html}`, /caseUA/, letter.subject);
        assert.deepStrictEqual(russianWordsIn(`${letter.subject} ${letter.html}`), [], letter.subject);
        assert.doesNotMatch(`${letter.subject} ${letter.html}`, MONEY, letter.subject);
    });
});
