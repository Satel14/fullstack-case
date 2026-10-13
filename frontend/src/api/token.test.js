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

test('setting the token clears it from the other storage', () => {
    setToken('remembered', true);
    setToken('this-tab', false);

    expect(localStorage.getItem('token')).toBeNull();
    expect(getToken()).toBe('this-tab');

    setToken('remembered-again', true);

    expect(sessionStorage.getItem('token')).toBeNull();
    expect(getToken()).toBe('remembered-again');
});

test('removing the token clears both storages', () => {
    localStorage.setItem('token', 'a');
    sessionStorage.setItem('token', 'b');

    removeToken();

    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(getToken()).toBeNull();
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
        expect(() => removeToken()).not.toThrow();
    } finally {
        spy.mockRestore();
    }
});
