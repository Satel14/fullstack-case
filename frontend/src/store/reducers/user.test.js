import usersReducer from './user';
import userFields from '../config/userFields';
import { LOGIN_USER, LOGOUT_USER, UPDATE_USER_FIELD } from '../types';

const profile = {
    user_id: 7,
    user_login: 'player',
    user_email: 'player@example.com',
    user_balance: '12.50',
    user_avatar: 4,
    user_receiveInfo: 'https://steamcommunity.com/id/player',
    user_role: 10,
    user_mutedUntil: '2099-01-01T00:00:00.000Z',
};

test('signing in maps every API field without changing the previous state or converting values', () => {
    const previous = Object.freeze({ ...usersReducer(undefined, {}), sessionChecked: true });
    const result = usersReducer(previous, { type: LOGIN_USER, payloadUser: profile });

    expect(result).toEqual({
        id: 7,
        login: 'player',
        email: 'player@example.com',
        balance: '12.50',
        avatar: 4,
        receiveInfo: 'https://steamcommunity.com/id/player',
        role: 10,
        mutedUntil: '2099-01-01T00:00:00.000Z',
        sessionChecked: true,
    });
    expect(previous.id).toBeNull();
    expect(Object.keys(userFields)).toEqual(Object.keys(profile));
});

test('a partial sign-in payload keeps the existing undefined-field behavior', () => {
    const result = usersReducer(undefined, { type: LOGIN_USER, payloadUser: { user_login: 'guest' } });

    expect(result.login).toBe('guest');
    Object.values(userFields).filter((field) => field !== 'login').forEach((field) => {
        expect(result).toHaveProperty(field, undefined);
    });
});

test('logout and field updates preserve all unrelated fields', () => {
    const previous = Object.freeze(usersReducer(undefined, { type: LOGIN_USER, payloadUser: profile }));

    expect(usersReducer(previous, { type: LOGOUT_USER })).toEqual({ ...previous, login: null });
    expect(usersReducer(previous, { type: UPDATE_USER_FIELD, payloadKey: 'balance', payloadData: '15.75' }))
        .toEqual({ ...previous, balance: '15.75' });
    expect(usersReducer(previous, { type: 'unknown' })).toBe(previous);
});
