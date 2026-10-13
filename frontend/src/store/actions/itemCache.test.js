import { itemInfoFetch, addItemsToCache } from './itemCache';
import { ADD_ITEMS_CACHE } from '../types';

jest.mock('../../api/all/item', () => ({
    getItemsInfo: jest.fn(),
}));

const { getItemsInfo } = require('../../api/all/item');

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

const answerWith = (catalogue) => (ids) => Promise.resolve({
    status: 200,
    data: Object.fromEntries(ids.filter((id) => catalogue[id]).map((id) => [id, catalogue[id]])),
});

const named = (ids) => Object.fromEntries(ids.map((id) => [id, { item_itemId: Number(id), item_name: `name ${id}` }]));

const requestedIds = () => getItemsInfo.mock.calls.map(([ids]) => ids);

beforeEach(() => {
    getItemsInfo.mockImplementation(answerWith(named(Array.from({ length: 500 }, (_, i) => String(i + 1)))));
});

test('items asked for in the same tick are fetched with one request', async () => {
    const { state, dispatch } = makeStore();

    const results = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => dispatch(itemInfoFetch(id))));

    expect(getItemsInfo).toHaveBeenCalledTimes(1);
    expect(requestedIds()[0].sort((a, b) => a - b)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(results.map((r) => r.item_name)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => `name ${id}`));
    expect(state.itemCache[7].item_name).toBe('name 7');
});

test('concurrent requests for the same item share one id in one request', async () => {
    let release;
    getItemsInfo.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const { dispatch } = makeStore();

    const calls = [dispatch(itemInfoFetch(707)), dispatch(itemInfoFetch(707)), dispatch(itemInfoFetch('707'))];
    await Promise.resolve();
    release({ status: 200, data: { 707: { item_itemId: 707, item_name: 'AK-47 | Redline' } } });
    const results = await Promise.all(calls);

    expect(getItemsInfo).toHaveBeenCalledTimes(1);
    expect(requestedIds()[0]).toEqual(['707']);
    expect(results.every((r) => r.item_name === 'AK-47 | Redline')).toBe(true);
});

test('a cached item is not fetched again, and a later tick starts a new request', async () => {
    const { dispatch } = makeStore();

    await dispatch(itemInfoFetch(1));
    await dispatch(itemInfoFetch(1));
    expect(getItemsInfo).toHaveBeenCalledTimes(1);

    await Promise.all([dispatch(itemInfoFetch(1)), dispatch(itemInfoFetch(2))]);
    expect(getItemsInfo).toHaveBeenCalledTimes(2);
    expect(requestedIds()[1]).toEqual(['2']);
});

test('more than 200 items are split into requests of at most 200 ids', async () => {
    const { state, dispatch } = makeStore();
    const ids = Array.from({ length: 450 }, (_, i) => i + 1);

    await Promise.all(ids.map((id) => dispatch(itemInfoFetch(id))));

    expect(requestedIds().map((batch) => batch.length)).toEqual([200, 200, 50]);
    expect(new Set(requestedIds().flat()).size).toBe(450);
    expect(Object.keys(state.itemCache)).toHaveLength(450);
});

test('an item the server does not know gets a placeholder', async () => {
    getItemsInfo.mockImplementation(answerWith(named(['1'])));
    const { state, dispatch } = makeStore();

    const [known, unknown] = await Promise.all([dispatch(itemInfoFetch(1)), dispatch(itemInfoFetch(999))]);

    expect(known.item_name).toBe('name 1');
    expect(unknown.item_name).toBe('Item 999');
    expect(state.itemCache[999].item_name).toBe('Item 999');
});

test('an id the server would refuse gets a placeholder without spoiling the request for the others', async () => {
    const { dispatch } = makeStore();

    const results = await Promise.all([1, undefined, 'abc', 0, 2].map((id) => dispatch(itemInfoFetch(id))));

    expect(requestedIds()).toEqual([['1', '2']]);
    expect(results.map((r) => r.item_name)).toEqual(['name 1', 'Item undefined', 'Item abc', 'Item 0', 'name 2']);
});

test('nothing is requested when every id is one the server would refuse', async () => {
    const { dispatch } = makeStore();

    const result = await dispatch(itemInfoFetch('x'));

    expect(result.item_name).toBe('Item x');
    expect(getItemsInfo).not.toHaveBeenCalled();
});

test('a failed request gives every item in it a placeholder that the next lookup asks for again', async () => {
    getItemsInfo.mockRejectedValueOnce({ error: 500 });
    const { state, dispatch } = makeStore();

    const failed = await Promise.all([dispatch(itemInfoFetch(1)), dispatch(itemInfoFetch(2))]);
    expect(failed.map((r) => r.item_name)).toEqual(['Item 1', 'Item 2']);
    expect(state.itemCache[2].item_name).toBe('Item 2');

    expect((await dispatch(itemInfoFetch(2))).item_name).toBe('name 2');
    expect(state.itemCache[2].item_name).toBe('name 2');
    expect(requestedIds()).toEqual([['1', '2'], ['2']]);
});

test('an item the server does not know is not asked for again', async () => {
    getItemsInfo.mockImplementation(answerWith({}));
    const { dispatch } = makeStore();

    await dispatch(itemInfoFetch(999));
    expect((await dispatch(itemInfoFetch(999))).item_name).toBe('Item 999');

    expect(getItemsInfo).toHaveBeenCalledTimes(1);
});

test('a failed request does not replace an item the drop feed delivered meanwhile', async () => {
    let fail;
    getItemsInfo.mockReturnValueOnce(new Promise((resolve, reject) => { fail = reject; }));
    const { state, dispatch } = makeStore();

    const lookup = dispatch(itemInfoFetch(707));
    await Promise.resolve();
    dispatch(addItemsToCache({ 707: { item_itemId: 707, item_name: 'AK', pricesInCredits: { default: 5 } } }));
    fail({ error: 500 });

    expect((await lookup).item_name).toBe('AK');
    expect(state.itemCache[707]).toEqual({ item_itemId: 707, item_name: 'AK', pricesInCredits: { default: 5 } });
});

test('the same id as a number and as a string is looked up once', async () => {
    const { dispatch } = makeStore();
    const ids = Array.from({ length: 199 }, (_, i) => i + 1);

    await Promise.all([...ids, 300, '300'].map((id) => dispatch(itemInfoFetch(id))));

    expect(requestedIds().map((batch) => batch.length)).toEqual([200]);
});

test('items delivered with the drop feed fill the cache without any request', async () => {
    const { state, dispatch } = makeStore();

    dispatch(addItemsToCache({ 707: { item_itemId: 707, item_name: 'AK' }, 708: null }));
    await dispatch(itemInfoFetch(707));

    expect(state.itemCache[707].item_name).toBe('AK');
    expect(state.itemCache[708]).toBeUndefined();
    expect(getItemsInfo).not.toHaveBeenCalled();
});
