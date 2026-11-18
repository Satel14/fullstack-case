import React from 'react';
import {
    act, render, screen, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import HeaderThird from './HeaderThird';
import Inventory from '../pages/Inventory';
import itemCacheReducer from '../store/reducers/itemCache';
import i18n from '../i18n';
import { getItemsInfo } from '../api/all/item';
import { getProfileStorage, getStorageLastItemsWithUserInfo } from '../api/all/storage';

jest.mock('../api/all/ws', () => ({ __esModule: true, default: { on: jest.fn(), off: jest.fn() } }));
jest.mock('../api/all/item', () => ({ getItemsInfo: jest.fn() }));
jest.mock('../api/all/storage', () => ({
    getProfileStorage: jest.fn(),
    getStorageLastItemsWithUserInfo: jest.fn(),
}));

afterAll(() => i18n.changeLanguage('uk'));

test.each([
    ['feed', 'unknown'], ['feed', 'failed'], ['inventory', 'unknown'], ['inventory', 'failed'],
])('a cached %s %s placeholder follows language changes without another item request', async (surface, kind) => {
    await i18n.changeLanguage('uk');
    if (kind === 'failed') {
        getItemsInfo.mockRejectedValue({ error: 500 });
    } else {
        getItemsInfo.mockResolvedValue({ data: {} });
    }
    const row = {
        storage_id: 1, storage_itemId: 999, storage_userId: 7, storage_color: 'default', storage_status: 'inventory',
    };
    getStorageLastItemsWithUserInfo.mockResolvedValue({ status: 200, data: [row], itemList: {} });
    getProfileStorage.mockImplementation(({ status }) => Promise.resolve({ data: status === 'inventory' ? [row] : [] }));
    const store = createStore(combineReducers({
        user: () => ({ id: 7, login: 'player' }),
        modules: () => ({}),
        itemCache: itemCacheReducer,
    }), applyMiddleware(thunk));

    const { container } = render(
        <Provider store={store}>
            <MemoryRouter>
                {surface === 'feed' ? <HeaderThird /> : <Inventory />}
            </MemoryRouter>
        </Provider>,
    );
    const name = () => (surface === 'feed'
        ? screen.getByRole('link').getAttribute('aria-label')
        : container.querySelector('.inventorypage-card__name')?.textContent);

    await waitFor(() => expect(name()).toContain('Предмет #999'));
    const cached = store.getState().itemCache[999];
    expect(cached.placeholder).toBe(kind);
    expect(cached).not.toHaveProperty('item_name');
    const calls = getItemsInfo.mock.calls.length;

    await act(async () => { await i18n.changeLanguage('en'); });
    expect(name()).toContain('Item #999');
    expect(name()).not.toContain('Предмет #999');
    await act(async () => { await i18n.changeLanguage('uk'); });
    expect(name()).toContain('Предмет #999');
    expect(getItemsInfo).toHaveBeenCalledTimes(calls);
    expect(store.getState().itemCache[999]).toBe(cached);
});
