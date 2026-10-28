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
    /\bEpic\b/,
    /(?<![а-яіїєґ])(?<!за )рахун|депозит|\bdeposit/i,
];

const CURRENCY = /(?<![а-яіїєґ])грн(?![а-яіїєґ])|грив(н|ен)|дол+ар|євро(?!п)|(?<![a-z])(uah|usd|dollar|euro(?!pe)|hryvn)|\$|€/i;
const MONEY = /грош|кошт(и|ів|ам|ах)|\bmoney|\bfunds\b|\bcash\b/i;
const SAYS_NO_REAL_MONEY = /справжні гроші не|реальні кошти не|не є грошима|no real money|not money/i;
const SAY_THE_DEMO_TAKES_NO_MONEY = ['faq.q2.answer', 'faq.q8.question', 'faq.q8.answer', 'deposit.info', 'payment.note'];

test('no text promises something the demo does not have: a captcha, a group, traders or a payment provider', () => {
    const untrue = everyText
        .filter(([, , text]) => UNTRUE.some((pattern) => pattern.test(text)))
        .map(([language, key]) => `${language} ${key}`);

    expect(untrue).toEqual([]);
});

test('no text names a currency other than ₴', () => {
    const foreign = everyText
        .filter(([, , text]) => CURRENCY.test(text))
        .map(([language, key]) => `${language} ${key}`);

    expect(foreign).toEqual([]);
});

test('only the texts saying the demo takes no real money speak of money', () => {
    const money = everyText
        .filter(([, key, text]) => MONEY.test(text) && !SAY_THE_DEMO_TAKES_NO_MONEY.includes(key))
        .map(([language, key]) => `${language} ${key}`);

    expect(money).toEqual([]);
});

test('every answer allowed to speak of money says the demo takes none', () => {
    const affirming = everyText
        .filter(([, key, text]) => SAY_THE_DEMO_TAKES_NO_MONEY.includes(key) && !text.trim().endsWith('?') && !SAYS_NO_REAL_MONEY.test(text))
        .map(([language, key]) => `${language} ${key}`);

    expect(affirming).toEqual([]);
});
