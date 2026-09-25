import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import usersReducer from '../store/reducers/user';
import itemCacheReducer from '../store/reducers/itemCache';
import moduleReducer from '../store/reducers/module';
import { LOGIN_USER } from '../store/types';
import Inventory from './Inventory';

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
    getItemInfoById: jest.fn(),
    getItemPriceById: jest.fn(),
}));

jest.mock('../api/all/storage', () => ({
    getProfileStorage: jest.fn(),
    sellItemByStorageId: jest.fn(),
}));

const openNotification = require('../components/mini/openNotification');
const { getProfileStorage, sellItemByStorageId } = require('../api/all/storage');
const { getItemInfoById, getItemPriceById } = require('../api/all/item');

const server = { inventory: [], sold: [], balance: 0 };

const inventoryRows = (count) => Array.from({ length: count }, (_, i) => ({
    storage_id: count - i, storage_itemId: 1, storage_color: 'default', storage_status: 'inventory',
}));

beforeEach(() => {
    openNotification.mockReset();
    getItemInfoById.mockImplementation((id) => Promise.resolve({ data: { item_name: `Item ${id}` } }));
    getItemPriceById.mockResolvedValue({ prices: { default: 10 } });
    server.sold = [];
    server.balance = 0;
    getProfileStorage.mockImplementation(({ status, limit, offset = 0 }) => {
        const rows = status === 'inventory' ? server.inventory : server.sold;
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

const renderInventory = () => {
    const store = createStore(
        combineReducers({ user: usersReducer, itemCache: itemCacheReducer, modules: moduleReducer }),
        applyMiddleware(thunk),
    );
    store.dispatch({ type: LOGIN_USER, payloadUser: { user_id: 7, user_login: 'player', user_balance: '0.00' } });
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
        'error', 'openCase.sellErrorTitle', 'inventory.sellAllSkipped {"sold":4,"skipped":1}',
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

test('sell all reaches sellable items behind a full page of items the server refuses', async () => {
    server.inventory = inventoryRows(205);
    const sell = sellItemByStorageId.getMockImplementation();
    sellItemByStorageId.mockImplementation((storageId) => (
        storageId > 5 ? Promise.reject({ error: 422, message: 'no price' }) : sell(storageId)
    ));
    renderInventory();

    await clickSellAll();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'openCase.sellErrorTitle', 'inventory.sellAllSkipped {"sold":5,"skipped":200}',
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
        'error', 'openCase.sellErrorTitle', 'inventory.sellAllSkipped {"sold":0,"skipped":205}',
    ));
});
