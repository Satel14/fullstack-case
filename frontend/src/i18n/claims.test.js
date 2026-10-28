import uk from './locales/uk/translation.json';
import en from './locales/en/translation.json';

const values = (node, at = '') => (typeof node === 'string'
    ? [[at, node]]
    : Object.entries(node).flatMap(([key, child]) => values(child, at ? `${at}.${key}` : key)));

const UNTRUE = [
    /recaptcha/i,
    /cases\s?ua(?!\.)|caseua/i,
    /трейдер|trader/i,
    /перенаправлені на сайт платіжної|redirected to the payment/i,
    /\bUAH\b|Ще грошей|More money|^Обміняли на гроші$|^Exchanged for money$/i,
    /\bEpic\b/,
];

test('no text promises something the demo does not have: a captcha, a group, traders or a payment provider', () => {
    const untrue = [...values(uk).map(([key, text]) => [`uk ${key}`, text]), ...values(en).map(([key, text]) => [`en ${key}`, text])]
        .filter(([, text]) => UNTRUE.some((pattern) => pattern.test(text)))
        .map(([key]) => key);

    expect(untrue).toEqual([]);
});
