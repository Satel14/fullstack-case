import {
    getUpgradeTargets,
    postUpgrade,
    getUpgradeHistory,
    verifyUpgrade,
} from './upgrade';

jest.mock('../fetch', () => ({ get: jest.fn(), post: jest.fn() }));

const { get, post } = require('../fetch');

beforeEach(() => jest.resetAllMocks());

test('targets use GET with the contract pagination defaults', async () => {
    const answer = { status: 200, data: { items: [], total: 0 } };
    get.mockResolvedValue(answer);

    await expect(getUpgradeTargets()).resolves.toBe(answer);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/upgrade/targets?limit=60&offset=0');
    expect(post).not.toHaveBeenCalled();
});

test('target filters and paging are encoded as flat query parameters', async () => {
    await getUpgradeTargets({
        minPrice: 12.5,
        maxPrice: 900,
        search: 'AK-47 | Red & Blue + #1',
        limit: 100,
        offset: 2147483647,
    });

    const url = new URL(get.mock.calls[0][0], 'https://example.test');
    expect(url.pathname).toBe('/upgrade/targets');
    expect(Object.fromEntries(url.searchParams)).toEqual({
        minPrice: '12.5',
        maxPrice: '900',
        search: 'AK-47 | Red & Blue + #1',
        limit: '100',
        offset: '2147483647',
    });
});

test('zero price bounds are retained and absent filters are omitted', async () => {
    await getUpgradeTargets({
        minPrice: 0, maxPrice: 0, limit: 1, offset: 0,
    });
    const url = new URL(get.mock.calls[0][0], 'https://example.test');
    expect(Object.fromEntries(url.searchParams)).toEqual({
        minPrice: '0', maxPrice: '0', limit: '1', offset: '0',
    });

    await getUpgradeTargets({ minPrice: undefined, maxPrice: null, search: undefined });
    expect(get).toHaveBeenLastCalledWith('/upgrade/targets?limit=60&offset=0');
});

test.each(['default', 'painted'])('upgrades POST the selected storage rows, %s target and shown threshold', async (targetColor) => {
    const body = {
        storageIds: [12, 34], targetItemId: 56, targetColor, expectedThreshold: 450000,
    };
    const answer = {
        status: 200,
        data: {
            upgradeId: 1,
            won: true,
            roll: 300000,
            threshold: 450000,
            stakeValue: '100.00',
            targetPrice: '200.00',
            nonce: 0,
            serverSeedHash: 'a'.repeat(64),
            clientSeed: 'client',
            item: { storage_id: 57, storage_itemId: 56, storage_color: targetColor },
        },
    };
    post.mockResolvedValue(answer);

    await expect(postUpgrade(body)).resolves.toBe(answer);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/upgrade', body);
    expect(get).not.toHaveBeenCalled();
});

test('history uses the profile upgrade endpoint and defaults to the first 50 records', async () => {
    const answer = { status: 200, data: { items: [], total: 0 } };
    get.mockResolvedValue(answer);

    await expect(getUpgradeHistory()).resolves.toBe(answer);
    expect(get).toHaveBeenCalledWith('/profile/provably-fair/upgrades?limit=50&offset=0');
    await getUpgradeHistory(10, 20);
    expect(get).toHaveBeenLastCalledWith('/profile/provably-fair/upgrades?limit=10&offset=20');
});

test.each([
    [{}, { roll: 123456, threshold: null, won: null }],
    [{ threshold: 450000 }, { roll: 123456, threshold: 450000, won: true }],
    [{ threshold: 0 }, { roll: 123456, threshold: 0, won: false }],
    [{ upgradeId: 42 }, {
        roll: 123456,
        threshold: 450000,
        won: true,
        seedMatches: true,
        inputsMatchRecord: true,
        matchesRecord: true,
    }],
])('verification POSTs seeds and optional fields %p unchanged', async (optional, data) => {
    const body = {
        serverSeed: 'revealed', clientSeed: 'client', nonce: 0, ...optional,
    };
    const answer = { status: 200, data };
    post.mockResolvedValue(answer);

    await expect(verifyUpgrade(body)).resolves.toBe(answer);
    expect(post).toHaveBeenCalledWith('/provably-fair/verify-upgrade', body);
});

test('API failures remain available to the caller', async () => {
    const failure = { error: 422, code: 'UPGRADE.ITEM_NOT_AVAILABLE', message: 'Unavailable' };
    post.mockRejectedValue(failure);

    await expect(postUpgrade({
        storageIds: [12], targetItemId: 56, targetColor: 'default', expectedThreshold: 450000,
    })).rejects.toBe(failure);
});
