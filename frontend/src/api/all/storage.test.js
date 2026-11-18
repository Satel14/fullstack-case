import { sellItemByStorageId } from './storage';

jest.mock('../token', () => ({ getToken: () => null, removeToken: () => undefined }));

beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: 200 }) }));
});

afterEach(() => {
    delete global.fetch;
});

const sentBody = () => JSON.parse(global.fetch.mock.calls[0][1].body);

test('a sale carries the rate its shown price was counted at', async () => {
    await sellItemByStorageId(5, 0.85);

    expect(global.fetch.mock.calls[0][0]).toMatch(/\/storage\/sell\/5$/);
    expect(global.fetch.mock.calls[0][1].method).toBe('PUT');
    expect(sentBody()).toEqual({ rate: 0.85 });
});

test.each([null, undefined, Number.NaN])('a sale without a usable rate (%p) sends none', async (rate) => {
    await sellItemByStorageId(5, rate);

    expect(sentBody()).toEqual({});
});
