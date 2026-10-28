import uk from './locales/uk/translation.json';
import en from './locales/en/translation.json';

const values = (node, at = '') => (typeof node === 'string'
    ? [[at, node]]
    : Object.entries(node).flatMap(([key, child]) => values(child, at ? `${at}.${key}` : key)));

const everyText = [
    ...values(uk).map(([key, text]) => ['uk', key, text]),
    ...values(en).map(([key, text]) => ['en', key, text]),
];

const UNTRUE = [
    /recaptcha/i,
    /cases\s?ua(?!\.)|caseua/i,
    /трейдер|trader/i,
    /перенаправлені на сайт платіжної|redirected to the payment/i,
    /\bUAH\b/i,
    /\bEpic\b/,
    /(^|[^а-яіїєґ])рахун|депозит|\bdeposit\b/i,
];

const SAY_THE_DEMO_TAKES_NO_MONEY = ['faq.q2.answer', 'faq.q8.question', 'faq.q8.answer', 'deposit.info', 'payment.note'];

test('no text promises something the demo does not have: a captcha, a group, traders or a payment provider', () => {
    const untrue = everyText
        .filter(([, , text]) => UNTRUE.some((pattern) => pattern.test(text)))
        .map(([language, key]) => `${language} ${key}`);

    expect(untrue).toEqual([]);
});

test('only the texts saying the demo takes no real money speak of money', () => {
    const money = everyText
        .filter(([, key, text]) => /грош|кошт(и|ів)|гривн|money|funds|hryvn/i.test(text) && !SAY_THE_DEMO_TAKES_NO_MONEY.includes(key))
        .map(([language, key]) => `${language} ${key}`);

    expect(money).toEqual([]);
});
