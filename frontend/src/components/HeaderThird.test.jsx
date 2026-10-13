import React from 'react';
import { render, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore, combineReducers } from 'redux';
import HeaderThird from './HeaderThird';
import { getStorageLastItemsWithUserInfo } from '../api/all/storage';
import { itemInfoFetch, addItemsToCache } from '../store/actions/itemCache';

jest.mock('react-i18next', () => ({
    withTranslation: () => (Component) => (props) => <Component {...props} t={(key) => key} />,
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../api/all/ws', () => ({
    __esModule: true, default: { on: jest.fn(), off: jest.fn() },
}));

jest.mock('../api/all/storage', () => ({
    getStorageLastItemsWithUserInfo: jest.fn(),
}));

jest.mock('../store/actions/itemCache', () => ({
    itemInfoFetch: jest.fn(),
    addItemsToCache: jest.fn(),
}));

const socket = require('../api/all/ws').default;

const drop = (id) => ({
    storage_id: id, storage_itemId: id * 10, storage_userId: id, storage_caseId: 1, storage_color: 0,
});

const deferredFeed = () => {
    let finish;
    getStorageLastItemsWithUserInfo.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    return (ids) => finish({ status: 200, data: ids.map(drop), itemList: {} });
};

const registered = (method) => socket[method].mock.calls
    .filter(([event]) => event === 'new-drop')
    .map(([, handler]) => handler);

const deliverDrop = (item) => registered('on').forEach((handler) => handler(item));

const renderFeed = () => render(
    <Provider store={createStore(combineReducers({ itemCache: (state = {}) => state }))}>
        <MemoryRouter>
            <HeaderThird />
        </MemoryRouter>
    </Provider>,
);

const shownDrops = () => [...document.querySelectorAll('.headersecond.third a')]
    .map((link) => Number(link.getAttribute('href').replace('/profile/', '')));

const flush = () => act(async () => { await new Promise((resolve) => { setTimeout(resolve, 0); }); });

beforeEach(() => {
    itemInfoFetch.mockImplementation((id) => ({ type: 'TEST_ITEM_INFO', id }));
    addItemsToCache.mockImplementation((itemList) => ({ type: 'TEST_ADD_ITEMS', itemList }));
});

test('drops that arrive while the feed loads are kept ahead of the loaded ones, without repeats', async () => {
    const finishLoad = deferredFeed();
    renderFeed();

    expect(registered('on')).toHaveLength(1);
    act(() => {
        deliverDrop(drop(11));
        deliverDrop(drop(12));
    });

    await act(async () => { finishLoad([11, 10, 9]); });

    expect(shownDrops()).toEqual([12, 11, 10, 9]);
});

test('a drop after the load goes first, a repeated drop is shown once, and the feed keeps 40 drops', async () => {
    const finishLoad = deferredFeed();
    renderFeed();
    await act(async () => { finishLoad(Array.from({ length: 40 }, (_, i) => 40 - i)); });

    act(() => {
        deliverDrop(drop(41));
        deliverDrop(drop(41));
    });

    const shown = shownDrops();
    expect(shown).toHaveLength(40);
    expect(shown.slice(0, 3)).toEqual([41, 40, 39]);
    expect(itemInfoFetch).toHaveBeenCalledWith(410);
});

test('a feed closed while it loads removes its listener and changes nothing when the load finishes', async () => {
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const finishLoad = deferredFeed();
    const { unmount } = renderFeed();

    unmount();
    await act(async () => { finishLoad([3, 2, 1]); });
    await flush();

    expect(registered('on')).toHaveLength(1);
    expect(registered('off')).toEqual(registered('on'));
    expect(addItemsToCache).not.toHaveBeenCalled();
    expect(itemInfoFetch).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
});

test('a feed closed after loading removes the same listener it added', async () => {
    const finishLoad = deferredFeed();
    const { unmount } = renderFeed();
    await act(async () => { finishLoad([1]); });

    unmount();

    expect(registered('on')).toHaveLength(1);
    expect(registered('off')).toEqual(registered('on'));
});
