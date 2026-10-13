import React from 'react';
import {
    act, render, screen, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import usersReducer from '../store/reducers/user';
import itemCacheReducer from '../store/reducers/itemCache';
import { LOGIN_USER } from '../store/types';
import roles from '../enum/role';
import Profile from './Profile';

jest.mock('react-i18next', () => ({
    withTranslation: () => (Component) => (props) => (
        <Component {...props} t={(key, options) => (options ? `${key} ${JSON.stringify(options)}` : key)} />
    ),
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

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

const viewer = {
    user_id: 7, user_login: 'Satel7', user_avatar: 3, user_role: roles.ADMINISTRATOR,
};

const renderProfile = (id) => {
    const store = createStore(combineReducers({ user: usersReducer, itemCache: itemCacheReducer }), applyMiddleware(thunk));
    store.dispatch({ type: LOGIN_USER, payloadUser: viewer });
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <Profile match={{ params: { id } }} />
            </MemoryRouter>
        </Provider>,
    );
};

const avatarUrls = (container) => [...container.querySelectorAll('[style]')]
    .map((node) => node.style.backgroundImage)
    .filter((bg) => bg.includes('/img/avatars/'));

beforeEach(() => {
    getUserById.mockReset();
    getFavoriteCaseByUserId.mockResolvedValue({ data: null });
    getStorageItemsCountByUserId.mockResolvedValue({ data: 0 });
    getStorageLastItemsByUserId.mockResolvedValue({ data: [] });
});

test('a profile that cannot be loaded shows not-found, never the viewer', async () => {
    getUserById.mockRejectedValue({ error: 400 });

    const { container } = renderProfile('99999');

    expect(await screen.findByText('error.notFound')).toBeInTheDocument();
    expect(screen.queryByText('Satel7')).toBeNull();
    expect(screen.queryByText('profile.roles.admin')).toBeNull();
    expect(avatarUrls(container)).toEqual([]);
});

test('a player without an avatar gets the default avatar, not the viewer\'s', async () => {
    getUserById.mockResolvedValue({
        data: {
            user_id: 5, user_login: 'testopen', user_avatar: null, user_role: roles.NORMAL,
        },
    });

    const { container } = renderProfile('5');

    expect(await screen.findByText('testopen')).toBeInTheDocument();
    expect(avatarUrls(container)).toEqual(['url(/img/avatars/1.png)']);
    expect(screen.getByText('profile.roles.user')).toBeInTheDocument();
    expect(screen.queryByText('Satel7')).toBeNull();
});

test('the viewer\'s own profile shows their own identity', async () => {
    getUserById.mockResolvedValue({ data: viewer });

    const { container } = renderProfile('7');

    await waitFor(() => expect(screen.getByText('Satel7')).toBeInTheDocument());
    expect(avatarUrls(container)).toEqual(['url(/img/avatars/3.png)']);
    expect(screen.getByText('profile.roles.admin')).toBeInTheDocument();
});

test('the best drop is the most valuable item, not the one with the rarest wear label', async () => {
    getUserById.mockResolvedValue({
        data: {
            user_id: 5, user_login: 'testopen', user_avatar: 2, user_role: roles.NORMAL,
        },
    });
    getStorageLastItemsByUserId.mockResolvedValue({
        data: [
            {
                storage_id: 3, storage_itemId: 1507, storage_color: 'default', storage_caseId: 1,
            },
            {
                storage_id: 2, storage_itemId: 361, storage_color: 'default', storage_caseId: 1,
            },
            {
                storage_id: 1, storage_itemId: 88, storage_color: 'painted', storage_caseId: 1,
            },
        ],
    });
    const items = {
        1507: { item_name: 'Nova | Caged Steel', item_rare: 'Factory New', pricesInCredits: { default: 7, painted: 10 } },
        361: { item_name: 'Shadow Daggers | Safari Mesh', item_rare: 'Field Tested', pricesInCredits: { default: 1939, painted: 2715 } },
        88: { item_name: 'AWP | Worm God', item_rare: 'Battle Scarred', pricesInCredits: JSON.stringify({ default: 300, painted: 2000 }) },
    };
    getItemsInfo.mockImplementation((ids) => Promise.resolve({ data: Object.fromEntries(ids.map((id) => [id, items[id]])) }));

    const { container } = renderProfile('5');

    await screen.findByText('testopen');
    const bestDrop = container.querySelector('.profilepage-firstblock__bestdrop span');
    expect(bestDrop.textContent).toBe('AWP | Worm God');
});

test('items that could not be loaded are left out of the history and the best drop', async () => {
    getUserById.mockResolvedValue({
        data: {
            user_id: 5, user_login: 'testopen', user_avatar: 2, user_role: roles.NORMAL,
        },
    });
    getStorageLastItemsByUserId.mockResolvedValue({
        data: [{
            storage_id: 1, storage_itemId: 4242, storage_color: 'default', storage_caseId: 1,
        }],
    });
    getItemsInfo.mockRejectedValue({ error: 500 });

    const { container } = renderProfile('5');

    await screen.findByText('testopen');
    expect(container.querySelector('.profilepage-firstblock__bestdrop span').textContent).toBe('profile.noDrop');
    expect(container.querySelectorAll('.casehistory-itemlist_item')).toHaveLength(0);
    expect(screen.queryByText(/4242/)).toBeNull();
});

test('an answer for a player the page has already left does not replace the player now shown', async () => {
    let answerFirst;
    getUserById.mockImplementation((id) => {
        if (id === 5) {
            return new Promise((resolve) => { answerFirst = resolve; });
        }
        return Promise.resolve({
            data: {
                user_id: 9, user_login: 'second', user_avatar: 4, user_role: roles.NORMAL,
            },
        });
    });
    const store = createStore(combineReducers({ user: usersReducer, itemCache: itemCacheReducer }), applyMiddleware(thunk));
    store.dispatch({ type: LOGIN_USER, payloadUser: viewer });
    const page = (id) => (
        <Provider store={store}>
            <MemoryRouter>
                <Profile match={{ params: { id } }} />
            </MemoryRouter>
        </Provider>
    );

    const { container, rerender } = render(page('5'));
    rerender(page('9'));
    expect(await screen.findByText('second')).toBeInTheDocument();

    await act(async () => {
        answerFirst({
            data: {
                user_id: 5, user_login: 'first', user_avatar: 2, user_role: roles.NORMAL,
            },
        });
        await new Promise((resolve) => { setTimeout(resolve, 50); });
    });

    expect(screen.queryByText('first')).toBeNull();
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(avatarUrls(container)).toEqual(['url(/img/avatars/4.png)']);
});

test('an item without a name is shown under the translated item placeholder', async () => {
    getUserById.mockResolvedValue({
        data: {
            user_id: 5, user_login: 'testopen', user_avatar: 2, user_role: roles.NORMAL,
        },
    });
    getStorageLastItemsByUserId.mockResolvedValue({
        data: [{
            storage_id: 1, storage_itemId: 1507, storage_color: 'default', storage_caseId: 1,
        }],
    });
    getItemsInfo.mockResolvedValue({
        data: { 1507: { item_name: '', item_imagePath: '/img/items/x.png', pricesInCredits: { default: 7 } } },
    });

    const { container } = renderProfile('5');

    await screen.findByText('testopen');
    const placeholderName = 'item.placeholder {"id":1507}';
    expect(container.querySelector('.profilepage-firstblock__bestdrop span').textContent).toBe(placeholderName);
    expect(container.querySelector('.casehistory-itemlist_item span').textContent).toBe(placeholderName);
    expect(screen.queryByText('Item #1507')).toBeNull();
});

test('every item of the history is loaded with one request', async () => {
    getUserById.mockResolvedValue({
        data: {
            user_id: 5, user_login: 'testopen', user_avatar: 2, user_role: roles.NORMAL,
        },
    });
    getStorageLastItemsByUserId.mockResolvedValue({
        data: Array.from({ length: 30 }, (_, i) => ({
            storage_id: i + 1, storage_itemId: 100 + (i % 12), storage_color: 'default', storage_caseId: 1,
        })),
    });
    getItemsInfo.mockImplementation((ids) => Promise.resolve({
        data: Object.fromEntries(ids.map((id) => [id, { item_name: `Gun ${id}`, pricesInCredits: { default: Number(id) } }])),
    }));

    const { container } = renderProfile('5');

    await screen.findByText('testopen');
    expect(getItemsInfo).toHaveBeenCalledTimes(1);
    expect(getItemsInfo.mock.calls[0][0]).toHaveLength(12);
    expect(container.querySelector('.profilepage-firstblock__bestdrop span').textContent).toBe('Gun 111');
});
