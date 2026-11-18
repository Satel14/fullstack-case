import { getAdminStats } from './admin';

jest.mock('../fetch', () => ({ get: jest.fn() }));

const { get } = require('../fetch');

beforeEach(() => jest.clearAllMocks());

test('stats leave default dates to the server and encode explicit ISO dates', () => {
    getAdminStats();
    expect(get).toHaveBeenLastCalledWith('/admin/stats');
    getAdminStats({ from: '2026-10-01T03:00:00+03:00', to: '2026-11-01T00:00:00Z' });
    const url = new URL(get.mock.calls[1][0], 'https://example.test');
    expect(url.pathname).toBe('/admin/stats');
    expect(Object.fromEntries(url.searchParams)).toEqual({ from: '2026-10-01T03:00:00+03:00', to: '2026-11-01T00:00:00Z' });
});
