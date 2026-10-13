import { userPostFetch, userPostRegisterFetch } from './user';

jest.mock('../../api/all/ws', () => ({ __esModule: true, default: {}, reconnectSocket: jest.fn() }));
jest.mock('../../api/all/profile', () => ({ editProfile: jest.fn() }));
jest.mock('../../api/all/other', () => ({ redeemPromocode: jest.fn() }));

const { reconnectSocket } = require('../../api/all/ws');

beforeEach(() => {
    localStorage.clear();
    reconnectSocket.mockReset();
    global.fetch = jest.fn(() => Promise.resolve({
        json: () => Promise.resolve({ jwt: 'fresh', user: { login: 'player' } }),
    }));
});

test.each([
    ['login', userPostFetch],
    ['registration', userPostRegisterFetch],
])('%s stores the token and reconnects the socket so chat sees the new session', async (name, action) => {
    const dispatch = jest.fn();

    await action({ login: 'player', password: 'secret123' })(dispatch);

    expect(localStorage.getItem('token')).toBe('fresh');
    expect(reconnectSocket).toHaveBeenCalledTimes(1);
});

test('a failed login does not reconnect the socket', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ status: 401, json: () => Promise.resolve({ message: 'wrong' }) }));

    const result = await userPostFetch({ login: 'player', password: 'bad' })(jest.fn());

    expect(result).toEqual({ error: 401, message: 'wrong' });
    expect(reconnectSocket).not.toHaveBeenCalled();
});

describe('userPostRegisterFetch', () => {
    test('a confirm-email answer resolves to the status and signs nobody in', async () => {
        global.fetch = jest.fn(() => Promise.resolve({
            json: () => Promise.resolve({ status: 'confirm-email', message: 'Перевірте пошту, щоб завершити реєстрацію' }),
        }));
        const dispatch = jest.fn();

        const result = await userPostRegisterFetch({ login: 'player', password: 'secret123', email: 'player@e.ua' })(dispatch);

        expect(result).toEqual({ status: 'confirm-email' });
        expect(localStorage.getItem('token')).toBeNull();
        expect(dispatch).not.toHaveBeenCalled();
        expect(reconnectSocket).not.toHaveBeenCalled();
    });

    test('a taken-login answer resolves to the status and the message and signs nobody in', async () => {
        global.fetch = jest.fn(() => Promise.resolve({
            status: 422,
            json: () => Promise.resolve({ message: 'Такий логін уже зайнятий' }),
        }));
        const dispatch = jest.fn();

        const result = await userPostRegisterFetch({ login: 'player', password: 'secret123', email: 'player@e.ua' })(dispatch);

        expect(result).toEqual({ error: 422, message: 'Такий логін уже зайнятий' });
        expect(localStorage.getItem('token')).toBeNull();
        expect(dispatch).not.toHaveBeenCalled();
    });

    test('an answer that is not JSON resolves to its status and signs nobody in', async () => {
        global.fetch = jest.fn(() => Promise.resolve({
            status: 502,
            json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON at position 0')),
        }));
        const dispatch = jest.fn();

        const result = await userPostRegisterFetch({ login: 'player', password: 'secret123', email: 'player@e.ua' })(dispatch);

        expect(result).toEqual({ error: 502 });
        expect(localStorage.getItem('token')).toBeNull();
        expect(dispatch).not.toHaveBeenCalled();
        expect(reconnectSocket).not.toHaveBeenCalled();
    });

    test('a jwt answer stores the token, logs the user in and reconnects the socket', async () => {
        global.fetch = jest.fn(() => Promise.resolve({
            json: () => Promise.resolve({ jwt: 'signed.jwt', user: { login: 'player' } }),
        }));
        const dispatch = jest.fn();

        const result = await userPostRegisterFetch({ login: 'player', password: 'secret123', email: 'player@e.ua' })(dispatch);

        expect(localStorage.getItem('token')).toBe('signed.jwt');
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'LOGIN_USER', payloadUser: { login: 'player' } }));
        expect(reconnectSocket).toHaveBeenCalledTimes(1);
        expect(result).toBe(false);
    });
});

describe('remember me', () => {
    const { getProfileFetch, logoutProfile } = require('./user');

    beforeEach(() => {
        sessionStorage.clear();
    });

    test('a login that is not remembered keeps the token for this browser session only', async () => {
        localStorage.setItem('token', 'older');

        await userPostFetch({ login: 'player', password: 'secret123' }, false)(jest.fn());

        expect(sessionStorage.getItem('token')).toBe('fresh');
        expect(localStorage.getItem('token')).toBeNull();
        expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ login: 'player', password: 'secret123' });
    });

    test('a remembered login keeps the token in localStorage and drops a session copy', async () => {
        sessionStorage.setItem('token', 'older');

        await userPostFetch({ login: 'player', password: 'secret123' }, true)(jest.fn());

        expect(localStorage.getItem('token')).toBe('fresh');
        expect(sessionStorage.getItem('token')).toBeNull();
    });

    test('registration keeps the token in localStorage', async () => {
        sessionStorage.setItem('token', 'older');

        await userPostRegisterFetch({ login: 'player', password: 'secret123', email: 'player@e.ua' })(jest.fn());

        expect(localStorage.getItem('token')).toBe('fresh');
        expect(sessionStorage.getItem('token')).toBeNull();
    });

    test('a session-only token loads the profile and is dropped when the server rejects it', async () => {
        sessionStorage.setItem('token', 'this-tab');
        global.fetch = jest.fn(() => Promise.resolve({ status: 401, json: () => Promise.resolve({ message: 'no' }) }));
        const dispatch = jest.fn();

        await getProfileFetch()(dispatch);

        expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer this-tab');
        expect(sessionStorage.getItem('token')).toBeNull();
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'LOGOUT_USER' }));
    });

    test('logging out clears the token from both storages', () => {
        jest.useFakeTimers();
        try {
            localStorage.setItem('token', 'remembered');
            sessionStorage.setItem('token', 'this-tab');
            const dispatch = jest.fn();

            logoutProfile()(dispatch);

            expect(localStorage.getItem('token')).toBeNull();
            expect(sessionStorage.getItem('token')).toBeNull();
            expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'LOGOUT_USER' }));
        } finally {
            jest.clearAllTimers();
            jest.useRealTimers();
        }
    });
});

describe('the profile check on page load', () => {
    const { getProfileFetch } = require('./user');
    const run = async (response) => {
        localStorage.setItem('token', 'kept');
        global.fetch = jest.fn(response);
        const dispatch = jest.fn();
        await getProfileFetch()(dispatch);
        return dispatch;
    };

    test('keeps the session when the server cannot check it right now', async () => {
        const dispatch = await run(() => Promise.resolve({ status: 503, json: () => Promise.resolve({ message: 'later' }) }));

        expect(localStorage.getItem('token')).toBe('kept');
        expect(dispatch).not.toHaveBeenCalled();
    });

    test('keeps the session when the request itself fails', async () => {
        const dispatch = await run(() => Promise.reject(new TypeError('Failed to fetch')));

        expect(localStorage.getItem('token')).toBe('kept');
        expect(dispatch).not.toHaveBeenCalled();
    });

    test('ends the session only when the token is rejected', async () => {
        const dispatch = await run(() => Promise.resolve({ status: 401, json: () => Promise.resolve({ message: 'no' }) }));

        expect(localStorage.getItem('token')).toBeNull();
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'LOGOUT_USER' }));
    });

    test('logs the user in when the profile comes back', async () => {
        const dispatch = await run(() => Promise.resolve({ status: 200, json: () => Promise.resolve({ user: { login: 'player' } }) }));

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payloadUser: { login: 'player' } }));
    });
});
