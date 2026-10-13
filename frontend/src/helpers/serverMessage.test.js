import { clientErrorMessage } from './serverMessage';

test.each([
    [{ error: 400, message: 'Посилання недійсне' }, 'Посилання недійсне'],
    [{ error: 422, message: 'Некоректний client seed' }, 'Некоректний client seed'],
    [{ error: 429, message: 'Забагато запитів' }, 'Забагато запитів'],
])('a 4xx answer keeps its message: %j', (failure, expected) => {
    expect(clientErrorMessage(failure)).toBe(expected);
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
    expect(clientErrorMessage(failure)).toBeNull();
});
