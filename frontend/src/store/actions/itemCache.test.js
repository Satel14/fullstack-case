import { itemInfoFetch, addItemsToCache } from './itemCache';
import { ADD_ITEMS_CACHE } from '../types';

jest.mock('../../api/all/item', () => ({
    getItemInfoById: jest.fn(),
}));

const { getItemInfoById } = require('../../api/all/item');

const makeStore = () => {
    const state = { itemCache: {} };
    const dispatch = jest.fn((action) => {
        if (typeof action === 'function') {
            return action(dispatch, () => state);
        }
        if (action.type === ADD_ITEMS_CACHE) {
            state.itemCache = { ...state.itemCache, [action.payloadKey]: action.payloadData };
        }
        return action;
    });
    return { state, dispatch };
};

beforeEach(() => {
    getItemInfoById.mockReset();
});

test('concurrent requests for the same item share one network call', async () => {
    let release;
    getItemInfoById.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const { dispatch } = makeStore();

    const calls = [dispatch(itemInfoFetch(707)), dispatch(itemInfoFetch(707)), dispatch(itemInfoFetch(707))];
    release({ data: { item_itemId: 707, item_name: 'AK-47 | Redline' } });
    const results = await Promise.all(calls);

    expect(getItemInfoById).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.item_name === 'AK-47 | Redline')).toBe(true);
});

test('a cached item is not fetched again, and a finished request can be retried for another id', async () => {
    getItemInfoById.mockResolvedValue({ data: { item_itemId: 1, item_name: 'one' } });
    const { dispatch } = makeStore();

    await dispatch(itemInfoFetch(1));
    await dispatch(itemInfoFetch(1));
    expect(getItemInfoById).toHaveBeenCalledTimes(1);

    getItemInfoById.mockResolvedValue({ data: { item_itemId: 2, item_name: 'two' } });
    await dispatch(itemInfoFetch(2));
    expect(getItemInfoById).toHaveBeenCalledTimes(2);
});

test('items delivered with the drop feed fill the cache without any request', async () => {
    const { state, dispatch } = makeStore();

    dispatch(addItemsToCache({ 707: { item_itemId: 707, item_name: 'AK' }, 708: null }));
    await dispatch(itemInfoFetch(707));

    expect(state.itemCache[707].item_name).toBe('AK');
    expect(state.itemCache[708]).toBeUndefined();
    expect(getItemInfoById).not.toHaveBeenCalled();
});
