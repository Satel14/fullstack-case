import {
    clientErrorMessage, isRefusal, joinSentences, promocodeText, serverText,
} from './serverMessage';
import i18n from '../i18n';

const en = i18n.getFixedT('en');
const uk = i18n.getFixedT('uk');

test('one text is shown as it is, several read as sentences', () => {
    expect(joinSentences(['Баланс повний'])).toBe('Баланс повний');
    expect(joinSentences(['Продано: 2.', 'Баланс повний', 'Зачекайте!', 'Що далі?', 'Отже…']))
        .toBe('Продано: 2. Баланс повний. Зачекайте! Що далі? Отже…');
    expect(joinSentences([])).toBe('');
});

test('only a 4xx answer counts as a refusal', () => {
    expect(isRefusal({ error: 400 })).toBe(true);
    expect(isRefusal({ error: 422, message: 'x' })).toBe(true);
    expect(isRefusal({ error: 499 })).toBe(true);
    expect(isRefusal({ error: 500 })).toBe(false);
    expect(isRefusal({ error: 302 })).toBe(false);
    expect(isRefusal(new TypeError('Failed to fetch'))).toBe(false);
    expect(isRefusal(null)).toBe(false);
});

test.each([
    [{ error: 400, message: 'Посилання недійсне' }, 'Посилання недійсне'],
    [{ error: 422, message: 'Некоректний client seed' }, 'Некоректний client seed'],
    [{ error: 429, message: 'Забагато запитів' }, 'Забагато запитів'],
])('a 4xx answer keeps its message: %j', (failure, expected) => {
    expect(clientErrorMessage(uk, failure)).toBe(expected);
});

test.each([
    [{ error: 500, message: 'ER_LOCK_WAIT_TIMEOUT' }],
    [{ error: 502 }],
    [{ error: 422 }],
    [{ error: 422, message: '' }],
    [{ error: 422, message: { text: 'object' } }],
    [new TypeError('Failed to fetch')],
    [null],
    [undefined],
])('anything else has no message to show: %p', (failure) => {
    expect(clientErrorMessage(uk, failure)).toBeNull();
});

test('a known code is shown in the language of the site', () => {
    expect(serverText(en, { code: 'PROMOCODE.EXPIRED', message: 'Термін дії цього промокоду минув' })).toBe('This promocode has expired');
    expect(serverText(uk, { code: 'PROMOCODE.EXPIRED', message: 'інший текст' })).toBe('Термін дії цього промокоду минув');
    expect(clientErrorMessage(en, { error: 429, code: 'LIMIT.SELL', message: 'Забагато продажів. Зачекайте трохи.' })).toBe('Too many sales. Wait a little.');
});

test('an unknown or malformed code shows the message the server sent', () => {
    expect(serverText(en, { code: 'PROMOCODE.SOMETHING_NEW', message: 'Нова відмова' })).toBe('Нова відмова');
    expect(serverText(en, { code: 'faq.q2.answer', message: 'Відмова' })).toBe('Відмова');
    expect(serverText(en, { code: 42, message: 'Відмова' })).toBe('Відмова');
});

test('an answer with nothing to show gives null', () => {
    expect(serverText(en, { code: 'PROMOCODE.SOMETHING_NEW' })).toBeNull();
    expect(serverText(en, { message: '' })).toBeNull();
    expect(serverText(en, { message: { text: 'object' } })).toBeNull();
    expect(serverText(en, null)).toBeNull();
    expect(clientErrorMessage(en, { error: 500, code: 'SERVER.ERROR', message: 'x' })).toBeNull();
});

test('an activated promocode names its bonus and, when it has one, its description', () => {
    expect(promocodeText(en, { code: 'PROMOCODE.ADDED', params: { bonus: '12.50', description: 'Spring gift' } }))
        .toBe('Promocode activated: 12.50 ₴ credited. Bonus description: Spring gift');
    expect(promocodeText(uk, { code: 'PROMOCODE.ADDED', params: { bonus: 50, description: '' } }))
        .toBe('Промокод активовано, нараховано 50 ₴.');
    expect(promocodeText(uk, { code: 'PROMOCODE.ADDED', params: { bonus: 50, description: null } }))
        .toBe('Промокод активовано, нараховано 50 ₴.');
    expect(promocodeText(en, { code: 'PROMOCODE.EXPIRED', message: 'x' })).toBe('This promocode has expired');
});
