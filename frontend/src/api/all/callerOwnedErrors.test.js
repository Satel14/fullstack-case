import { editProfile, sendMoneyForUser, depositBalance } from './profile';
import { getProfileStorage } from './storage';
import { setClientSeed, rotateSeed, verifyOpen } from './provablyFair';

jest.mock('../../components/mini/openNotification', () => jest.fn());
jest.mock('../../i18n', () => ({ t: (key) => key }));
jest.mock('../token', () => ({ getToken: () => null, removeToken: () => undefined }));

const openNotification = require('../../components/mini/openNotification');

beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ status: 429, message: 'Забагато запитів' }),
    }));
});

afterEach(() => {
    delete global.fetch;
});

test.each([
    ['editProfile', () => editProfile({ user_avatar: 3 })],
    ['sendMoneyForUser', () => sendMoneyForUser({ userIdTo: 2, money_count: 5 })],
    ['getProfileStorage', () => getProfileStorage({ status: 'inventory', limit: 200 })],
    ['depositBalance', () => depositBalance(100)],
    ['setClientSeed', () => setClientSeed('lucky')],
    ['rotateSeed', () => rotateSeed()],
    ['verifyOpen', () => verifyOpen({ serverSeed: 's', clientSeed: 'c', nonce: 0 })],
])('%s leaves the failure toast to its caller', async (name, call) => {
    await expect(call()).rejects.toEqual({ error: 429, message: 'Забагато запитів' });
    expect(openNotification).not.toHaveBeenCalled();
});
