import { get, post } from './fetch';

jest.mock('../i18n', () => ({ t: (key) => key }));
jest.mock('../components/mini/openNotification', () => ({ __esModule: true, default: jest.fn() }));

const respond = (status, body = {}) => Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
});

const realLocation = window.location;

beforeEach(() => {
    delete window.location;
    window.location = { href: '/case/dust2' };
    localStorage.clear();
    global.fetch = jest.fn();
});

afterAll(() => {
    window.location = realLocation;
});

test('a 401 on a request that carried a token ends the session', async () => {
    localStorage.setItem('token', 'revoked');
    global.fetch.mockReturnValue(respond(401, { message: 'no' }));

    await expect(get('/profile/provably-fair')).rejects.toEqual({ error: 401 });

    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/');
});

test('a 401 without a token and any other failure leave the page alone', async () => {
    global.fetch.mockReturnValue(respond(401));
    await expect(get('/profile/provably-fair')).rejects.toEqual({ error: 401 });
    expect(window.location.href).toBe('/case/dust2');

    localStorage.setItem('token', 'valid');
    global.fetch.mockReturnValue(respond(403, { message: 'banned' }));
    await expect(post('/case/open', {})).rejects.toEqual({ error: 403, message: 'banned' });
    expect(localStorage.getItem('token')).toBe('valid');
    expect(window.location.href).toBe('/case/dust2');
});
