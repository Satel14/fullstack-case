import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { getAllModules, syncSaleRate } from './module';
import moduleReducer from '../reducers/module';
import { LOAD_MODULES } from '../types';

const storeWithModules = (...loaded) => {
    const store = createStore(combineReducers({ modules: moduleReducer }), applyMiddleware(thunk));
    loaded.forEach((module) => store.dispatch({ type: LOAD_MODULES, payloadKey: module.param, payloadData: module }));
    return store;
};

const answer = (body) => {
    global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve(body) }));
};

afterEach(() => {
    delete global.fetch;
});

test('every module the server lists is stored under its param, in the order received', async () => {
    const rate = { param: 'uah-credit-rate', extraData: 2 };
    const bonus = { param: 'bonusList', extraData: [] };
    answer({ data: [rate, bonus] });
    const dispatch = jest.fn();

    await expect(getAllModules()(dispatch)).resolves.toBeUndefined();

    expect(global.fetch.mock.calls[0][0]).toMatch(/\/module\/all$/);
    expect(dispatch.mock.calls).toEqual([
        [{ type: LOAD_MODULES, payloadKey: 'uah-credit-rate', payloadData: rate }],
        [{ type: LOAD_MODULES, payloadKey: 'bonusList', payloadData: bonus }],
    ]);
});

test('modules keyed by name are stored the same way', async () => {
    const rate = { param: 'uah-credit-rate', extraData: 2 };
    answer({ data: { first: rate } });
    const dispatch = jest.fn();

    await getAllModules()(dispatch);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: LOAD_MODULES, payloadKey: 'uah-credit-rate', payloadData: rate });
});

test('an answer without modules stores nothing and does not fail', async () => {
    answer({ status: 500 });
    const dispatch = jest.fn();

    await expect(getAllModules()(dispatch)).resolves.toBeUndefined();

    expect(dispatch).not.toHaveBeenCalled();
});

test('a sale rate the server names replaces the stored one and keeps the rest of the module', () => {
    const bonus = { param: 'bonusList', status: 1, extraData: [] };
    const store = storeWithModules({ param: 'uah-credit-rate', status: 1, extraData: 1 }, bonus);

    store.dispatch(syncSaleRate(0.85));

    expect(store.getState().modules).toEqual({
        'uah-credit-rate': { param: 'uah-credit-rate', status: 1, extraData: 0.85 },
        bonusList: bonus,
    });
});

test('a sale rate named while no modules were loaded is stored too', () => {
    const store = storeWithModules();

    store.dispatch(syncSaleRate(0.9));

    expect(store.getState().modules['uah-credit-rate'].extraData).toBe(0.9);
});

test.each([
    ['the rate already stored', 0.85],
    ['no rate', undefined],
    ['a rate that is not a positive number', 0],
    ['a rate written as text', '0.5'],
])('%s changes nothing in the store', (name, rate) => {
    const store = storeWithModules({ param: 'uah-credit-rate', status: 1, extraData: '0.85' });
    const before = store.getState().modules;

    store.dispatch(syncSaleRate(rate));

    expect(store.getState().modules).toBe(before);
});
