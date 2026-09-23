import { userPostFetch, userPostRegisterFetch } from './user';

jest.mock('../../api/all/ws', () => ({ __esModule: true, default: {}, reconnectSocket: jest.fn() }));
jest.mock('../../api/all/profile', () => ({ editProfile: jest.fn() }));
jest.mock('../../api/all/other', () => ({ usePromocode: jest.fn() }));

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
    global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ message: 'wrong' }) }));

    const result = await userPostFetch({ login: 'player', password: 'bad' })(jest.fn());

    expect(result).toBe('wrong');
    expect(reconnectSocket).not.toHaveBeenCalled();
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
