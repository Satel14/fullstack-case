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
    withTranslation: () => (Component) => (props) => <Component {...props} t={(key) => key} />,
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
