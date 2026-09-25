import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import itemCacheReducer from '../../store/reducers/itemCache';
import { ADD_ITEMS_CACHE } from '../../store/types';
import InventoryHistory from './InventoryHistory';

jest.mock('react-i18next', () => ({
    withTranslation: () => (Component) => (props) => <Component {...props} t={(key) => key} />,
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../../api/all/storage', () => ({ getStorageLastItemsByUserId: jest.fn() }));

jest.mock('../../api/all/item', () => ({ getItemInfoById: jest.fn() }));

const { getStorageLastItemsByUserId } = require('../../api/all/storage');
const { getItemInfoById } = require('../../api/all/item');

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
    getItemInfoById.mockReturnValue(new Promise(() => {}));
});

const imagePath = '/img/items/Rifles/AK-47/AK-47 Redline.png';

test('each history row shows the item picture from the item cache', async () => {
    const store = createStore(combineReducers({ itemCache: itemCacheReducer }), applyMiddleware(thunk));
    store.dispatch({
        type: ADD_ITEMS_CACHE,
        payloadKey: 5,
        payloadData: {
            item_name: 'AK-47 | Redline', item_rare: 'Field Tested', item_type: 'Rifle', item_imagePath: imagePath,
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
});
