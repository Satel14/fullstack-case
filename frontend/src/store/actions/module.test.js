import { getAllModules } from './module';
import { LOAD_MODULES } from '../types';

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
