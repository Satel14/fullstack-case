import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore, combineReducers } from 'redux';
import usersReducer from '../store/reducers/user';
import { LOGIN_USER } from '../store/types';
import roles from '../enum/role';
import Profile from './Profile';

jest.mock('react-i18next', () => ({
    withTranslation: () => (Component) => (props) => <Component {...props} t={(key) => key} />,
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

jest.mock('../api/all/item', () => ({ getItemInfoById: jest.fn() }));

const { getUserById } = require('../api/all/user');
const { getItemInfoById } = require('../api/all/item');
const {
    getFavoriteCaseByUserId, getStorageItemsCountByUserId, getStorageLastItemsByUserId,
} = require('../api/all/storage');

const viewer = {
    user_id: 7, user_login: 'Satel7', user_avatar: 3, user_role: roles.ADMINISTRATOR,
};

const renderProfile = (id) => {
    const store = createStore(combineReducers({ user: usersReducer }));
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
    getItemInfoById.mockImplementation((id) => Promise.resolve({ data: items[id] }));

    const { container } = renderProfile('5');

    await screen.findByText('testopen');
    const bestDrop = container.querySelector('.profilepage-firstblock__bestdrop span');
    expect(bestDrop.textContent).toBe('AWP | Worm God');
});
