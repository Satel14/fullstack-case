import roles from '../enum/role';
import { isAdmin } from './permissions';

test('isAdmin is true only for the administrator role', () => {
    expect(isAdmin({ role: roles.ADMINISTRATOR })).toBe(true);
    expect(isAdmin({ role: String(roles.ADMINISTRATOR) })).toBe(true);
});

test('isAdmin is false for every other role, including famous', () => {
    for (const role of [roles.NORMAL, roles.FAMOUS, roles.YOUTUBER, roles.STREAMER, roles.BANNED, roles.BANNED_CHAT]) {
        expect(isAdmin({ role })).toBe(false);
    }
});

test('isAdmin is false for absent or malformed input', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin({})).toBe(false);
    expect(isAdmin({ role: 'admin' })).toBe(false);
});
