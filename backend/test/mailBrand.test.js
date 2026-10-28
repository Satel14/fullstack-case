const test = require('node:test');
const assert = require('node:assert');
const mail = require('../src/modules/mailSender');
const { MONEY, russianWordsIn } = require('./helpers/ukrainian');

const letters = Object.keys(mail)
    .filter((name) => name.endsWith('Email'))
    .map((name) => mail[name]({ login: 'player', link: 'http://host/page?token=abc', minutes: 30, hours: 24 }));

test('every letter names the site as CASES.UA', () => {
    assert.ok(letters.length >= 4, 'the letter templates are exported');
    letters.forEach((letter) => {
        assert.match(`${letter.subject} ${letter.html}`, /CASES\.UA/, letter.subject);
        assert.doesNotMatch(`${letter.subject} ${letter.html}`, /caseUA/, letter.subject);
    });
});

test('no letter uses Russian words or speaks of money', () => {
    letters.forEach((letter) => {
        assert.deepStrictEqual(russianWordsIn(`${letter.subject} ${letter.html}`), [], letter.subject);
        assert.doesNotMatch(`${letter.subject} ${letter.html}`, MONEY, letter.subject);
    });
});
