import React from 'react';
import {
    act, render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import usersReducer from '../store/reducers/user';
import itemCacheReducer from '../store/reducers/itemCache';
import roles from '../enum/role';
import i18n from '../i18n';
import Profile from './Profile';

jest.mock('react-reveal/Fade', () => ({ children }) => <>{children}</>);

jest.mock('../api/all/user', () => ({ getUserById: jest.fn() }));

jest.mock('../api/all/storage', () => ({
    getFavoriteCaseByUserId: jest.fn(),
    getStorageItemsCountByUserId: jest.fn(),
    getStorageLastItemsByUserId: jest.fn(),
}));

jest.mock('../api/all/item', () => ({ getItemsInfo: jest.fn() }));

const { getUserById } = require('../api/all/user');
const { getItemsInfo } = require('../api/all/item');
const {
    getFavoriteCaseByUserId, getStorageItemsCountByUserId, getStorageLastItemsByUserId,
} = require('../api/all/storage');

afterAll(() => i18n.changeLanguage('uk'));

test('the drop tooltips follow a language switch without the profile being reloaded', async () => {
    await i18n.changeLanguage('uk');
    getUserById.mockResolvedValue({
        data: {
            user_id: 5, user_login: 'testopen', user_avatar: 2, user_role: roles.NORMAL,
        },
    });
    getFavoriteCaseByUserId.mockResolvedValue({ data: null });
    getStorageItemsCountByUserId.mockResolvedValue({
        data: 1, uniqueCases: 1, bestDrop: { storage_id: 1, storage_itemId: 88, storage_color: 'default' },
    });
    getStorageLastItemsByUserId.mockResolvedValue({
        data: [{
            storage_id: 2, storage_itemId: 88, storage_color: 'default', storage_caseId: 1,
        }],
    });
    getItemsInfo.mockResolvedValue({
        data: {
            88: {
                item_itemId: 88, item_name: 'AWP | Worm God', item_type: 'sniper rifles', item_rare: 'Field Tested', item_grade: 'restricted', pricesInCredits: { default: 300 },
            },
        },
    });
    const store = createStore(combineReducers({ user: usersReducer, itemCache: itemCacheReducer }), applyMiddleware(thunk));

    const { container } = render(
        <Provider store={store}>
            <MemoryRouter>
                <Profile match={{ params: { id: '5' } }} />
            </MemoryRouter>
        </Provider>,
    );
    await screen.findByText('testopen');
    await act(async () => { await i18n.changeLanguage('en'); });

    fireEvent.mouseEnter(container.querySelector('.casehistory-itemlist_item'));
    fireEvent.mouseEnter(container.querySelector('.profilepage-firstblock__bestdrop__drop'));

    await waitFor(() => expect(screen.getAllByRole('tooltip').map((tip) => tip.textContent)).toEqual([
        'Name: AWP | Worm God, Type: sniper rifles, Rarity: Restricted, Wear: Field Tested, Color: Regular',
        'Name: AWP | Worm God, Type: sniper rifles, Rarity: Restricted, Wear: Field Tested, Color: Regular',
    ]));
});
