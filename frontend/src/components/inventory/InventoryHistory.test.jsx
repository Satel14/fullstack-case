import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import itemCacheReducer from '../../store/reducers/itemCache';
import { ADD_ITEM_LIST_CACHE } from '../../store/types';
import InventoryHistory from './InventoryHistory';

jest.mock('react-i18next', () => ({
    withTranslation: () => (Component) => (props) => <Component {...props} t={(key) => key} />,
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../../api/all/storage', () => ({ getStorageLastItemsByUserId: jest.fn() }));

jest.mock('../../api/all/item', () => ({ getItemsInfo: jest.fn() }));

const { getStorageLastItemsByUserId } = require('../../api/all/storage');
const { getItemsInfo } = require('../../api/all/item');

beforeEach(() => {
    getStorageLastItemsByUserId.mockResolvedValue({
        data: [
            {
                storage_id: 11, storage_itemId: 5, storage_color: 'default', storage_status: 'inventory',
            },
            {
                storage_id: 12, storage_itemId: 6, storage_color: 'default', storage_status: 'money',
            },
        ],
    });
    getItemsInfo.mockReturnValue(new Promise(() => {}));
});

const imagePath = '/img/items/Rifles/AK-47/AK-47 Redline.png';

const renderHistory = () => {
    const store = createStore(combineReducers({ itemCache: itemCacheReducer }), applyMiddleware(thunk));
    return render(
        <Provider store={store}>
            <InventoryHistory id={7} />
        </Provider>,
    );
};

const historyRow = (storageId) => ({
    storage_id: storageId, storage_itemId: 5, storage_color: 'default', storage_status: 'inventory',
});

const rowCount = (container) => container.querySelectorAll('.casehistory-itemlist_item').length;

test('a first load that fails stops the spinner, says so and can be retried', async () => {
    getStorageLastItemsByUserId.mockRejectedValueOnce({ error: 500 });
    const { container } = renderHistory();

    expect(await screen.findByText('inventory.historyLoadFailed')).toBeInTheDocument();
    expect(container.querySelector('.loader')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /inventory\.retry/ }));

    await waitFor(() => expect(rowCount(container)).toBe(2));
    expect(screen.queryByText('inventory.historyLoadFailed')).toBeNull();
});

test('a "load more" that fails keeps the rows, says so and can be pressed again', async () => {
    getStorageLastItemsByUserId
        .mockResolvedValueOnce({ data: [1, 2, 3, 4, 5].map(historyRow) })
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({ data: [6, 7].map(historyRow) });
    const { container } = renderHistory();
    await waitFor(() => expect(rowCount(container)).toBe(5));

    fireEvent.click(screen.getByRole('button', { name: /inventory\.loadMore/ }));

    expect(await screen.findByText('inventory.historyLoadFailed')).toBeInTheDocument();
    expect(rowCount(container)).toBe(5);

    fireEvent.click(screen.getByRole('button', { name: /inventory\.loadMore/ }));

    await waitFor(() => expect(rowCount(container)).toBe(7));
    expect(screen.queryByText('inventory.historyLoadFailed')).toBeNull();
    expect(getStorageLastItemsByUserId).toHaveBeenLastCalledWith(7, 5, 5);
    expect(screen.queryByRole('button', { name: /inventory\.loadMore/ })).toBeNull();
});

test('an item whose earlier lookup failed is asked for again', async () => {
    getStorageLastItemsByUserId.mockResolvedValue({
        data: [{
            storage_id: 21, storage_itemId: 31, storage_color: 'default', storage_status: 'inventory',
        }],
    });
    getItemsInfo.mockResolvedValue({ data: { 31: { item_name: 'M4A1-S | Hot Rod', item_imagePath: imagePath } } });
    const store = createStore(combineReducers({ itemCache: itemCacheReducer }), applyMiddleware(thunk));
    store.dispatch({
        type: ADD_ITEM_LIST_CACHE,
        payloadItems: { 31: { item_itemId: 31, item_name: 'Item 31', placeholder: 'failed' } },
    });

    render(
        <Provider store={store}>
            <InventoryHistory id={7} />
        </Provider>,
    );

    await waitFor(() => expect(store.getState().itemCache[31].item_name).toBe('M4A1-S | Hot Rod'));
    expect(getItemsInfo).toHaveBeenCalledWith(['31']);
});

test('each history row shows the item picture from the item cache', async () => {
    const store = createStore(combineReducers({ itemCache: itemCacheReducer }), applyMiddleware(thunk));
    store.dispatch({
        type: ADD_ITEM_LIST_CACHE,
        payloadItems: {
            5: {
                item_name: 'AK-47 | Redline', item_rare: 'Field Tested', item_type: 'Rifle', item_imagePath: imagePath, item_grade: 'classified',
            },
        },
    });

    const { container } = render(
        <Provider store={store}>
            <InventoryHistory id={7} />
        </Provider>,
    );

    await waitFor(() => expect(container.querySelectorAll('.casehistory-itemlist_item')).toHaveLength(2));
    const [cached, uncached] = container.querySelectorAll('.casehistory-itemlist_item');

    expect(cached.style.backgroundImage).toBe(`url(${encodeURI(imagePath)})`);
    expect(uncached.style.backgroundImage).toBe('none');
    expect(cached.style.getPropertyValue('--rarity')).toBe('#d32ce6');
    expect(uncached.style.getPropertyValue('--rarity')).toBe('#6d81b0');
});

test('each history row names the grade beside the wear and the type', async () => {
    const store = createStore(combineReducers({ itemCache: itemCacheReducer }), applyMiddleware(thunk));
    store.dispatch({
        type: ADD_ITEM_LIST_CACHE,
        payloadItems: {
            5: {
                item_name: 'AK-47 | Redline', item_rare: 'Field Tested', item_type: 'Rifle', item_imagePath: imagePath, item_grade: 'classified',
            },
        },
    });

    render(
        <Provider store={store}>
            <InventoryHistory id={7} />
        </Provider>,
    );

    expect(await screen.findByText('grade.classified · Field Tested Rifle')).toBeInTheDocument();
});
