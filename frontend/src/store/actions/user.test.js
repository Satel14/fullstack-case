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
