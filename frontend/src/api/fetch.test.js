import { get, post } from './fetch';

const respond = (status, body = {}) => Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
});

const realLocation = window.location;

beforeEach(() => {
    delete window.location;
    window.location = { href: '/case/dust2', reload: jest.fn() };
    localStorage.clear();
    sessionStorage.clear();
    global.fetch = jest.fn();
});

afterAll(() => {
    window.location = realLocation;
});

test('a 401 on a request that carried a token ends the session and reloads the page the visitor is on', async () => {
    localStorage.setItem('token', 'revoked');
    global.fetch.mockReturnValue(respond(401, { message: 'no' }));

    await expect(get('/profile/provably-fair')).rejects.toEqual({ error: 401 });

    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.reload).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/case/dust2');
});

test('a token kept for this browser session only is sent, and a 401 for it ends that session too', async () => {
    sessionStorage.setItem('token', 'this-tab');
    global.fetch.mockReturnValue(respond(401));

    await expect(get('/profile/provably-fair')).rejects.toEqual({ error: 401 });

    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer this-tab');
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(window.location.reload).toHaveBeenCalledTimes(1);
});

test('several requests failing with the same revoked token reload only once', async () => {
    localStorage.setItem('token', 'revoked');
    global.fetch.mockReturnValue(respond(401));

    await Promise.allSettled([get('/a'), get('/b'), post('/c', {})]);

    expect(window.location.reload).toHaveBeenCalledTimes(1);
});

test('a 401 for a token that was already replaced by a new login leaves the new session alone', async () => {
    localStorage.setItem('token', 'old');
    global.fetch.mockImplementation(async () => {
        localStorage.setItem('token', 'new');
        return respond(401);
    });

    await expect(get('/profile/provably-fair')).rejects.toEqual({ error: 401 });

    expect(localStorage.getItem('token')).toBe('new');
    expect(window.location.reload).not.toHaveBeenCalled();
});

test('a 401 for this tab\'s session token keeps the sign-in another tab remembered', async () => {
    sessionStorage.setItem('token', 'stale-session');
    localStorage.setItem('token', 'fresh-remembered');
    global.fetch.mockReturnValue(respond(401));

    await expect(get('/profile/provably-fair')).rejects.toEqual({ error: 401 });

    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer stale-session');
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('token')).toBe('fresh-remembered');
    expect(window.location.reload).toHaveBeenCalledTimes(1);
});

test('a 401 for a remembered token that this tab replaced with a session sign-in drops only the rejected token', async () => {
    localStorage.setItem('token', 'revoked');
    global.fetch.mockImplementation(async () => {
        sessionStorage.setItem('token', 'new-session');
        return respond(401);
    });

    await expect(get('/profile/provably-fair')).rejects.toEqual({ error: 401 });

    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('token')).toBe('new-session');
    expect(window.location.reload).not.toHaveBeenCalled();
});

test('a 401 without a token and any other failure leave the page alone', async () => {
    global.fetch.mockReturnValue(respond(401));
    await expect(get('/profile/provably-fair')).rejects.toEqual({ error: 401 });
    expect(window.location.reload).not.toHaveBeenCalled();

    localStorage.setItem('token', 'valid');
    global.fetch.mockReturnValue(respond(403, { message: 'banned' }));
    await expect(post('/case/open', {})).rejects.toEqual({ error: 403, message: 'banned' });
    expect(localStorage.getItem('token')).toBe('valid');
    expect(window.location.href).toBe('/case/dust2');
});
