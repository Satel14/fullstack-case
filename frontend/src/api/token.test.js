import { getToken, setToken, removeToken } from './token';

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
});

test('a remembered session is kept in localStorage and read back at once', () => {
    setToken('remembered');

    expect(localStorage.getItem('token')).toBe('remembered');
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(getToken()).toBe('remembered');
});

test('a session that is not remembered lives in sessionStorage only', () => {
    setToken('this-tab', false);

    expect(sessionStorage.getItem('token')).toBe('this-tab');
    expect(localStorage.getItem('token')).toBeNull();
    expect(getToken()).toBe('this-tab');
});

test('a session-only sign-in leaves the remembered one of another tab alone and is read first in this tab', () => {
    setToken('remembered', true);
    setToken('this-tab', false);

    expect(localStorage.getItem('token')).toBe('remembered');
    expect(getToken()).toBe('this-tab');
});

test('a remembered sign-in replaces the remembered token and drops this tab\'s session token', () => {
    setToken('remembered', true);
    setToken('this-tab', false);

    setToken('remembered-again', true);

    expect(localStorage.getItem('token')).toBe('remembered-again');
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(getToken()).toBe('remembered-again');
});

test('removing a token clears it only from the storage that holds it', () => {
    localStorage.setItem('token', 'remembered');
    sessionStorage.setItem('token', 'this-tab');

    removeToken('this-tab');

    expect(sessionStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('token')).toBe('remembered');
    expect(getToken()).toBe('remembered');

    removeToken('remembered');

    expect(localStorage.getItem('token')).toBeNull();
    expect(getToken()).toBeNull();
});

test('removing a token that no storage holds any more leaves the stored ones alone', () => {
    localStorage.setItem('token', 'new-login');
    sessionStorage.setItem('token', 'this-tab');

    removeToken('revoked');

    expect(localStorage.getItem('token')).toBe('new-login');
    expect(sessionStorage.getItem('token')).toBe('this-tab');
});

test.each([
    ['remembered', true],
    ['session-only', false],
])('a %s sign-in the browser refuses to store is reported as not saved', (_, remember) => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    try {
        expect(setToken('fresh', remember)).toBe(false);
        expect(getToken()).toBeNull();
    } finally {
        spy.mockRestore();
    }
});

test('a stored sign-in is reported as saved', () => {
    expect(setToken('fresh', true)).toBe(true);
    expect(setToken('this-tab', false)).toBe(true);
});

test('no token reads as null', () => {
    expect(getToken()).toBeNull();
});

test('a storage the browser refuses to open reads as no token instead of throwing', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
    });
    try {
        expect(getToken()).toBeNull();
        expect(() => removeToken('any')).not.toThrow();
    } finally {
        spy.mockRestore();
    }
});
