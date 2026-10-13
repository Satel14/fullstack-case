import { userPostFetch, userPostRegisterFetch } from './user';
import { TOKEN_NOT_SAVED } from '../../api/token';

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

const withStorageRefused = async (run) => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    try {
        return await run();
    } finally {
        spy.mockRestore();
    }
};

test.each([
    ['a remembered login', (dispatch) => userPostFetch({ login: 'player', password: 'secret123' }, true)(dispatch)],
    ['a session-only login', (dispatch) => userPostFetch({ login: 'player', password: 'secret123' }, false)(dispatch)],
    ['a registration', (dispatch) => userPostRegisterFetch({ login: 'player', password: 'secret123', email: 'player@e.ua' })(dispatch)],
])('%s whose token the browser refuses to store fails and signs nobody in', async (_, signIn) => {
    const dispatch = jest.fn();

    const result = await withStorageRefused(() => signIn(dispatch));

    expect(result).toEqual({ error: TOKEN_NOT_SAVED });
    expect(dispatch).not.toHaveBeenCalled();
    expect(reconnectSocket).not.toHaveBeenCalled();
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

    test('a login that is not remembered keeps the token for this browser session only and leaves a remembered one alone', async () => {
        localStorage.setItem('token', 'older');

        await userPostFetch({ login: 'player', password: 'secret123' }, false)(jest.fn());

        expect(sessionStorage.getItem('token')).toBe('fresh');
        expect(localStorage.getItem('token')).toBe('older');
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

    const logOut = () => {
        jest.useFakeTimers();
        try {
            const dispatch = jest.fn();
            logoutProfile()(dispatch);
            return dispatch;
        } finally {
            jest.clearAllTimers();
            jest.useRealTimers();
        }
    };

    test('logging out of a session-only sign-in ends it and keeps the sign-in remembered in localStorage', () => {
        localStorage.setItem('token', 'remembered');
        sessionStorage.setItem('token', 'this-tab');

        const dispatch = logOut();

        expect(sessionStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('token')).toBe('remembered');
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'LOGOUT_USER' }));
    });

    test('logging out of a remembered sign-in clears it', () => {
        localStorage.setItem('token', 'remembered');

        const dispatch = logOut();

        expect(localStorage.getItem('token')).toBeNull();
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'LOGOUT_USER' }));
    });

    const answers = (...responses) => {
        global.fetch = jest.fn();
        responses.forEach((response) => global.fetch.mockImplementationOnce(response));
    };

    test('a rejected session-only token is dropped and the tab goes on with the sign-in remembered in localStorage', async () => {
        sessionStorage.setItem('token', 'stale-session');
        localStorage.setItem('token', 'fresh-remembered');
        answers(
            () => Promise.resolve({ status: 401, json: () => Promise.resolve({ message: 'no' }) }),
            () => Promise.resolve({ status: 200, json: () => Promise.resolve({ user: { login: 'remembered-player' } }) }),
        );
        const dispatch = jest.fn((action) => (typeof action === 'function' ? action(dispatch) : action));

        await getProfileFetch()(dispatch);

        expect(sessionStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('token')).toBe('fresh-remembered');
        expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh-remembered');
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payloadUser: { login: 'remembered-player' } }));
        expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'LOGOUT_USER' }));
        expect(reconnectSocket).toHaveBeenCalledTimes(1);
    });

    test('a 401 that arrives after another tab signed in keeps the new sign-in', async () => {
        localStorage.setItem('token', 'revoked');
        answers(
            () => {
                localStorage.setItem('token', 'new-login-from-tab-b');
                return Promise.resolve({ status: 401, json: () => Promise.resolve({ message: 'no' }) });
            },
            () => Promise.resolve({ status: 200, json: () => Promise.resolve({ user: { login: 'player-b' } }) }),
        );
        const dispatch = jest.fn((action) => (typeof action === 'function' ? action(dispatch) : action));

        await getProfileFetch()(dispatch);

        expect(localStorage.getItem('token')).toBe('new-login-from-tab-b');
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payloadUser: { login: 'player-b' } }));
        expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'LOGOUT_USER' }));
        expect(reconnectSocket).toHaveBeenCalledTimes(1);
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
