import { confirmEmailFetch } from './user';
import { LOGIN_USER } from '../types';

jest.mock('../../api/all/user', () => ({ confirmEmail: jest.fn() }));
jest.mock('../../api/all/ws', () => ({ __esModule: true, default: {}, reconnectSocket: jest.fn() }));

const { confirmEmail } = require('../../api/all/user');
const { reconnectSocket } = require('../../api/all/ws');

beforeEach(() => {
    localStorage.clear();
    confirmEmail.mockResolvedValue({ jwt: 'signed.jwt', user: { user_id: 9, user_login: 'newbie' } });
});

test('a confirmed email signs the player in', async () => {
    const dispatch = jest.fn();

    const user = await confirmEmailFetch('a'.repeat(64))(dispatch);

    expect(confirmEmail).toHaveBeenCalledWith('a'.repeat(64));
    expect(localStorage.getItem('token')).toBe('signed.jwt');
    expect(dispatch).toHaveBeenCalledWith({ type: LOGIN_USER, payloadUser: { user_id: 9, user_login: 'newbie' } });
    expect(reconnectSocket).toHaveBeenCalled();
    expect(user.user_login).toBe('newbie');
});

test('a refused confirmation stores nothing', async () => {
    confirmEmail.mockRejectedValue({ error: 422, message: 'Посилання недійсне' });
    const dispatch = jest.fn();

    await expect(confirmEmailFetch('a'.repeat(64))(dispatch)).rejects.toEqual({ error: 422, message: 'Посилання недійсне' });
    expect(localStorage.getItem('token')).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
});
