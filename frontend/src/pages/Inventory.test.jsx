import React from 'react';
import {
    act, render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import usersReducer from '../store/reducers/user';
import itemCacheReducer from '../store/reducers/itemCache';
import moduleReducer from '../store/reducers/module';
import { LOGIN_USER } from '../store/types';
import i18n from '../i18n';
import Inventory from './Inventory';

jest.setTimeout(20000);

jest.mock('react-i18next', () => ({
    withTranslation: () => (Component) => (props) => (
        <Component {...props} t={(key, options) => (options ? `${key} ${JSON.stringify(options)}` : key)} />
    ),
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../api/all/ws', () => ({ __esModule: true, default: {}, reconnectSocket: jest.fn() }));
jest.mock('../components/mini/openNotification', () => jest.fn());

jest.mock('../api/all/item', () => ({
    getItemsInfo: jest.fn(),
}));

jest.mock('../api/all/storage', () => ({
    getProfileStorage: jest.fn(),
    sellItemByStorageId: jest.fn(),
}));

const openNotification = require('../components/mini/openNotification');
const { getProfileStorage, sellItemByStorageId } = require('../api/all/storage');
const { getItemsInfo } = require('../api/all/item');

const server = { inventory: [], sold: [], balance: 0 };

const inventoryRows = (count) => Array.from({ length: count }, (_, i) => ({
    storage_id: count - i, storage_itemId: 1, storage_color: 'default', storage_status: 'inventory',
}));

beforeEach(() => {
    openNotification.mockReset();
    getItemsInfo.mockImplementation((ids) => Promise.resolve({
        data: Object.fromEntries(ids.map((id) => [id, { item_name: `Item ${id}`, pricesInCredits: { default: 10 } }])),
    }));
    server.sold = [];
    server.balance = 0;
    getProfileStorage.mockImplementation(({ status, limit, offset = 0 }) => {
        const byStatus = { inventory: server.inventory, money: server.sold };
        const rows = byStatus[status] || [];
        return Promise.resolve({ status: 200, data: rows.slice(offset, offset + Math.min(limit, 200)) });
    });
    sellItemByStorageId.mockImplementation((storageId) => {
        const row = server.inventory.find((r) => r.storage_id === storageId);
        server.inventory = server.inventory.filter((r) => r !== row);
        server.sold = [{ ...row, storage_status: 'money' }, ...server.sold];
        server.balance += 10;
        return Promise.resolve({ status: 200, balance: server.balance.toFixed(2) });
    });
});

const makeStore = () => {
    const store = createStore(
        combineReducers({ user: usersReducer, itemCache: itemCacheReducer, modules: moduleReducer }),
        applyMiddleware(thunk),
    );
    store.dispatch({ type: LOGIN_USER, payloadUser: { user_id: 7, user_login: 'player', user_balance: '0.00' } });
    return store;
};

const renderInventory = () => {
    const store = makeStore();
    render(
        <Provider store={store}>
            <Inventory />
        </Provider>,
    );
    return store;
};

test('selling one item puts the new balance into the store', async () => {
    server.inventory = inventoryRows(2);
    const store = renderInventory();

    const [first] = await screen.findAllByRole('button', { name: /openCase.sellFor/ });
    fireEvent.click(first);

    await waitFor(() => expect(store.getState().user.balance).toBe('10.00'));
});

test('sell prices come with the item info, without a price request per row', async () => {
    server.inventory = [[3, 1, 'default'], [2, 2, 'painted'], [1, 3, 'default']].map(([storageId, itemId, color]) => ({
        storage_id: storageId, storage_itemId: itemId, storage_color: color, storage_status: 'inventory',
    }));
    getItemsInfo.mockImplementation(() => Promise.resolve({
        data: {
            1: { item_name: 'One', pricesInCredits: { default: 10, painted: 20 } },
            2: { item_name: 'Two', pricesInCredits: { default: 30, painted: 45.5 } },
            3: { item_name: 'Three', pricesInCredits: null },
        },
    }));
    renderInventory();

    expect(await screen.findByText('openCase.sellFor {"price":10}')).toBeInTheDocument();
    expect(screen.getByText('openCase.sellFor {"price":45.5}')).toBeInTheDocument();
    expect(screen.getByText('inventory.sell')).toBeInTheDocument();
    expect(getItemsInfo).toHaveBeenCalledTimes(1);
    expect(getItemsInfo.mock.calls[0][0].sort()).toEqual(['1', '2', '3']);
});

test('the inventory still opens when the item lookup fails, with plain sell buttons', async () => {
    await i18n.changeLanguage('uk');
    server.inventory = inventoryRows(2);
    getItemsInfo.mockRejectedValue({ error: 500 });
    renderInventory();

    expect(await screen.findAllByText('inventory.sell')).toHaveLength(2);
    expect(screen.getAllByText('Предмет #1')).toHaveLength(2);
    const metas = [...document.querySelectorAll('.inventorypage-card__meta')].map((meta) => meta.textContent.trim());
    expect(metas).toEqual(['', '']);
    expect(screen.queryByText(/openCase.sellFor/)).toBeNull();
});

test('a load that finishes after the page closed updates nothing', async () => {
    const consoleError = jest.spyOn(console, 'error');
    let answerInventory;
    getProfileStorage.mockImplementation(({ status }) => (status === 'inventory'
        ? new Promise((resolve) => { answerInventory = resolve; })
        : Promise.resolve({ status: 200, data: [] })));
    const { unmount } = render(
        <Provider store={makeStore()}>
            <Inventory />
        </Provider>,
    );

    unmount();
    await act(async () => {
        answerInventory({ status: 200, data: inventoryRows(2) });
        await new Promise((resolve) => { setTimeout(resolve, 50); });
    });

    const unmountedUpdates = consoleError.mock.calls.filter(([message]) => String(message).includes('unmounted component'));
    consoleError.mockRestore();
    expect(unmountedUpdates).toEqual([]);
});

test('a load that fails after the page closed updates nothing and reports nothing on the page the player went to', async () => {
    const consoleError = jest.spyOn(console, 'error');
    let failInventory;
    getProfileStorage.mockImplementation(({ status }) => (status === 'inventory'
        ? new Promise((resolve, reject) => { failInventory = reject; })
        : Promise.resolve({ status: 200, data: [] })));
    const { unmount } = render(
        <Provider store={makeStore()}>
            <Inventory />
        </Provider>,
    );

    unmount();
    await act(async () => {
        failInventory({ error: 500 });
        await new Promise((resolve) => { setTimeout(resolve, 50); });
    });

    const unmountedUpdates = consoleError.mock.calls.filter(([message]) => String(message).includes('unmounted component'));
    consoleError.mockRestore();
    expect(unmountedUpdates).toEqual([]);
    expect(openNotification).not.toHaveBeenCalled();
});

test('a load that fails while the page is open says so in place of empty tabs, and a retry loads the items', async () => {
    server.inventory = inventoryRows(1);
    getProfileStorage.mockImplementationOnce(() => Promise.reject({ error: 500 }));
    renderInventory();

    expect(await screen.findByText('common.loadFailed')).toBeInTheDocument();
    expect(screen.queryByText('inventory.emptyActive')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /common\.retry/ }));

    expect(await screen.findByText('openCase.sellFor {"price":10}')).toBeInTheDocument();
    expect(screen.queryByText('common.loadFailed')).toBeNull();
});

const clickSellAll = async () => {
    fireEvent.click(await screen.findByRole('button', { name: /inventory.sellAll/ }));
};

test('sell all sells every inventory item, not only the first page of 200', async () => {
    server.inventory = inventoryRows(250);
    const store = renderInventory();

    await clickSellAll();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('success', 'openCase.allSold'));
    expect(server.inventory).toHaveLength(0);
    expect(sellItemByStorageId).toHaveBeenCalledTimes(250);
    expect(store.getState().user.balance).toBe('2500.00');
});

test('sell all stops at the first failed sale and reports how many were sold', async () => {
    server.inventory = inventoryRows(5);
    const sell = sellItemByStorageId.getMockImplementation();
    sellItemByStorageId.mockImplementation((storageId) => (
        sellItemByStorageId.mock.calls.length === 3 ? Promise.reject({ error: 400 }) : sell(storageId)
    ));
    const store = renderInventory();

    await clickSellAll();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'openCase.sellErrorTitle', 'inventory.sellAllStopped {"sold":2}',
    ));
    expect(sellItemByStorageId).toHaveBeenCalledTimes(3);
    expect(server.inventory).toHaveLength(3);
    expect(store.getState().user.balance).toBe('20.00');
    expect(openNotification).not.toHaveBeenCalledWith('success', 'openCase.allSold');
});

test('sell all stops when the server says the player is selling too fast', async () => {
    server.inventory = inventoryRows(5);
    const sell = sellItemByStorageId.getMockImplementation();
    sellItemByStorageId.mockImplementation((storageId) => (
        sellItemByStorageId.mock.calls.length === 2
            ? Promise.reject({ error: 429, message: 'too many' })
            : sell(storageId)
    ));
    renderInventory();

    await clickSellAll();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'openCase.sellErrorTitle', 'inventory.sellAllRateLimited {"sold":1}',
    ));
    expect(sellItemByStorageId).toHaveBeenCalledTimes(2);
    expect(server.inventory).toHaveLength(4);
    expect(openNotification).not.toHaveBeenCalledWith('success', 'openCase.allSold');
});

test('sell all does not claim success when sold items stay in the inventory', async () => {
    server.inventory = inventoryRows(3);
    sellItemByStorageId.mockResolvedValue({ status: 200, balance: '10.00' });
    renderInventory();

    await clickSellAll();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'openCase.sellErrorTitle', 'inventory.sellAllStopped {"sold":3}',
    ));
    expect(sellItemByStorageId).toHaveBeenCalledTimes(3);
    expect(openNotification).not.toHaveBeenCalledWith('success', 'openCase.allSold');
});

test('sell all skips an item the server refuses to sell and sells everything else', async () => {
    server.inventory = inventoryRows(5);
    const sell = sellItemByStorageId.getMockImplementation();
    sellItemByStorageId.mockImplementation((storageId) => (
        storageId === 3 ? Promise.reject({ error: 422, message: 'no price' }) : sell(storageId)
    ));
    const store = renderInventory();

    await clickSellAll();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'openCase.sellErrorTitle', 'inventory.sellAllSkipped {"sold":4,"skipped":1} no price',
    ));
    expect(server.inventory.map((r) => r.storage_id)).toEqual([3]);
    expect(sellItemByStorageId).toHaveBeenCalledTimes(5);
    expect(store.getState().user.balance).toBe('40.00');
    expect(openNotification).not.toHaveBeenCalledWith('success', 'openCase.allSold');
});

test('an item that left the inventory during sell all is not reported as skipped', async () => {
    server.inventory = inventoryRows(5);
    const sell = sellItemByStorageId.getMockImplementation();
    sellItemByStorageId.mockImplementation((storageId) => {
        if (storageId === 3) {
            server.inventory = server.inventory.filter((r) => r.storage_id !== 3);
            return Promise.reject({ error: 422, message: 'gone' });
        }
        return sell(storageId);
    });
    renderInventory();

    await clickSellAll();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('success', 'openCase.allSold'));
    expect(server.inventory).toHaveLength(0);
});

test('sell all names the reasons of the items still in the inventory, each once', async () => {
    server.inventory = inventoryRows(6);
    const sell = sellItemByStorageId.getMockImplementation();
    const reasons = { 2: 'no price', 4: 'balance is full', 5: 'no price' };
    sellItemByStorageId.mockImplementation((storageId) => {
        if (storageId === 3) {
            server.inventory = server.inventory.filter((r) => r.storage_id !== 3);
            return Promise.reject({ error: 422, message: 'gone' });
        }
        if (reasons[storageId]) {
            return Promise.reject({ error: 422, message: reasons[storageId] });
        }
        return sell(storageId);
    });
    renderInventory();

    await clickSellAll();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'openCase.sellErrorTitle', 'inventory.sellAllSkipped {"sold":2,"skipped":3} no price balance is full',
    ));
});

test('sell all reaches sellable items behind a full page of items the server refuses', async () => {
    server.inventory = inventoryRows(205);
    const sell = sellItemByStorageId.getMockImplementation();
    sellItemByStorageId.mockImplementation((storageId) => (
        storageId > 5 ? Promise.reject({ error: 422, message: 'no price' }) : sell(storageId)
    ));
    renderInventory();

    await clickSellAll();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'openCase.sellErrorTitle', 'inventory.sellAllSkipped {"sold":5,"skipped":200} no price',
    ));
    expect(server.inventory).toHaveLength(200);
});

test('a row that shifts onto the next page during sell all is not counted twice', async () => {
    server.inventory = inventoryRows(205);
    sellItemByStorageId.mockImplementation(() => Promise.reject({ error: 422, message: 'no price' }));
    const page = getProfileStorage.getMockImplementation();
    let secondPageReads = 0;
    getProfileStorage.mockImplementation((request) => {
        if (request.status === 'inventory' && request.offset === 200) {
            secondPageReads += 1;
            if (secondPageReads === 2) {
                server.inventory = [{
                    storage_id: 1000, storage_itemId: 1, storage_color: 'default', storage_status: 'inventory',
                }, ...server.inventory];
            }
        }
        return page(request);
    });
    renderInventory();

    await clickSellAll();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'openCase.sellErrorTitle', 'inventory.sellAllSkipped {"sold":0,"skipped":205} no price',
    ));
});

test('if only the withdrawal lists fail, the loaded items stay usable and the withdrawals tab says so, with a retry', async () => {
    server.inventory = inventoryRows(1);
    let withdrawalsDown = true;
    getProfileStorage.mockImplementation(({ status, limit, offset = 0 }) => {
        if (withdrawalsDown && (status === 'waitingtrade' || status === 'received')) {
            return Promise.reject({ error: 502 });
        }
        const byStatus = { inventory: server.inventory, money: server.sold };
        const rows = byStatus[status] || [];
        return Promise.resolve({ status: 200, data: rows.slice(offset, offset + Math.min(limit, 200)) });
    });
    renderInventory();

    expect(await screen.findByRole('button', { name: /openCase\.sellFor/ })).toBeEnabled();
    expect(screen.queryByText('common.loadFailed')).toBeNull();

    fireEvent.click(screen.getByText('inventory.withdrawTab'));

    expect(await screen.findByText('common.loadFailed')).toBeInTheDocument();
    expect(screen.queryByText('inventory.withdrawEmpty')).toBeNull();

    withdrawalsDown = false;
    fireEvent.click(screen.getByRole('button', { name: /common\.retry/ }));

    expect(await screen.findByText('inventory.withdrawEmpty')).toBeInTheDocument();
    expect(screen.queryByText('common.loadFailed')).toBeNull();
});

test('a withdrawals retry shows that it is working and ignores further clicks until it answers', async () => {
    server.inventory = inventoryRows(1);
    let withdrawals = 'down';
    const waiting = [];
    getProfileStorage.mockImplementation(({ status, limit, offset = 0 }) => {
        if (status === 'waitingtrade' || status === 'received') {
            if (withdrawals === 'down') {
                return Promise.reject({ error: 502 });
            }
            return new Promise((resolve) => { waiting.push(resolve); });
        }
        const byStatus = { inventory: server.inventory, money: server.sold };
        const rows = byStatus[status] || [];
        return Promise.resolve({ status: 200, data: rows.slice(offset, offset + Math.min(limit, 200)) });
    });
    renderInventory();
    await screen.findByRole('button', { name: /openCase\.sellFor/ });
    fireEvent.click(screen.getByText('inventory.withdrawTab'));
    const retry = await screen.findByRole('button', { name: /common\.retry/ });

    withdrawals = 'slow';
    fireEvent.click(retry);
    await waitFor(() => expect(retry).toHaveClass('ant-btn-loading'));
    fireEvent.click(retry);
    fireEvent.click(retry);

    expect(waiting).toHaveLength(2);
    await act(async () => { waiting.forEach((answer) => answer({ status: 200, data: [] })); });
    expect(await screen.findByText('inventory.withdrawEmpty')).toBeInTheDocument();
    expect(screen.queryByText('common.loadFailed')).toBeNull();
});

const withdrawalsScript = (answers) => {
    let pair = 0;
    getProfileStorage.mockImplementation(({ status, limit, offset = 0 }) => {
        if (status === 'waitingtrade' || status === 'received') {
            if (status === 'waitingtrade') {
                pair += 1;
            }
            return answers(pair);
        }
        const byStatus = { inventory: server.inventory, money: server.sold };
        const rows = byStatus[status] || [];
        return Promise.resolve({ status: 200, data: rows.slice(offset, offset + Math.min(limit, 200)) });
    });
};

test('a withdrawals retry that fails after a newer load succeeded does not cover the lists with an error', async () => {
    server.inventory = inventoryRows(1);
    const lateFailures = [];
    withdrawalsScript((pair) => {
        if (pair === 1) {
            return Promise.reject({ error: 502 });
        }
        if (pair === 2) {
            return new Promise((resolve, reject) => { lateFailures.push(reject); });
        }
        return Promise.resolve({ status: 200, data: [] });
    });
    renderInventory();
    await screen.findByRole('button', { name: /openCase\.sellFor/ });
    fireEvent.click(screen.getByText('inventory.withdrawTab'));
    fireEvent.click(await screen.findByRole('button', { name: /common\.retry/ }));

    fireEvent.click(screen.getByText('inventory.active'));
    await clickSellAll();
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('success', 'openCase.allSold'));
    fireEvent.click(await screen.findByText('inventory.withdrawTab'));
    expect(await screen.findByText('inventory.withdrawEmpty')).toBeInTheDocument();

    await act(async () => { lateFailures.forEach((reject) => reject({ error: 504 })); });

    expect(screen.getByText('inventory.withdrawEmpty')).toBeInTheDocument();
    expect(screen.queryByText('common.loadFailed')).toBeNull();
});

test('a withdrawals retry that answers after the page closed updates nothing', async () => {
    server.inventory = inventoryRows(1);
    const lateFailures = [];
    withdrawalsScript((pair) => (pair === 1
        ? Promise.reject({ error: 502 })
        : new Promise((resolve, reject) => { lateFailures.push(reject); })));
    const consoleError = jest.spyOn(console, 'error');
    const { unmount } = render(
        <Provider store={makeStore()}>
            <Inventory />
        </Provider>,
    );
    await screen.findByRole('button', { name: /openCase\.sellFor/ });
    fireEvent.click(screen.getByText('inventory.withdrawTab'));
    fireEvent.click(await screen.findByRole('button', { name: /common\.retry/ }));

    unmount();
    await act(async () => { lateFailures.forEach((reject) => reject({ error: 504 })); });

    const unmountedUpdates = consoleError.mock.calls.filter(([message]) => String(message).includes('unmounted component'));
    consoleError.mockRestore();
    expect(unmountedUpdates).toEqual([]);
});

test('each card wears its item grade colour and names the grade beside the wear', async () => {
    server.inventory = [{
        storage_id: 1, storage_itemId: 1, storage_color: 'default', storage_status: 'inventory',
    }];
    getItemsInfo.mockImplementation(() => Promise.resolve({
        data: {
            1: {
                item_name: 'One', item_rare: 'Field Tested', item_type: 'rifles', item_grade: 'classified', pricesInCredits: { default: 10 },
            },
        },
    }));
    renderInventory();

    await screen.findByText('One');
    const card = document.querySelector('.inventorypage-card');
    expect(card.style.getPropertyValue('--rarity')).toBe('#d32ce6');
    expect(card.querySelector('.inventorypage-card__meta').textContent).toBe('grade.classified · Field Tested rifles');
});

test('a single sale the server refuses shows its reason, and a failed request still shows the plain sell error', async () => {
    server.inventory = inventoryRows(2);
    sellItemByStorageId
        .mockImplementationOnce(() => Promise.reject({ error: 422, message: 'balance is full' }))
        .mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')));
    renderInventory();

    const [first] = await screen.findAllByRole('button', { name: /openCase.sellFor/ });
    fireEvent.click(first);
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'openCase.sellErrorTitle', 'balance is full'));

    fireEvent.click(first);
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'openCase.sellErrorText'));
});

test('a single sale stopped by the limiter shows its reason too', async () => {
    server.inventory = inventoryRows(2);
    sellItemByStorageId.mockImplementationOnce(() => Promise.reject({ error: 429, message: 'too many sales' }));
    renderInventory();

    const [first] = await screen.findAllByRole('button', { name: /openCase.sellFor/ });
    fireEvent.click(first);

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'openCase.sellErrorTitle', 'too many sales'));
});
