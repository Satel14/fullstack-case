import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore } from 'redux';
import HeaderThird from './HeaderThird';
import i18n from '../i18n';
import socket from '../api/all/ws';
import { getStorageLastItemsWithUserInfo } from '../api/all/storage';

jest.mock('../api/all/ws', () => ({ __esModule: true, default: { on: jest.fn(), off: jest.fn() } }));
jest.mock('../api/all/storage', () => ({ getStorageLastItemsWithUserInfo: jest.fn() }));
jest.mock('../store/actions/itemCache', () => ({
    itemInfoFetch: (id) => ({ type: 'item', id }),
    addItemsToCache: () => ({ type: 'items' }),
}));

afterAll(() => i18n.changeLanguage('uk'));

const drop = (id) => ({
    storage_id: id, storage_itemId: 10, storage_userId: id, storage_color: 'default',
});

test.each([
    ['en', "Open Alice's profile: Knife, Covert", "Open Bob's profile: Knife, Covert", "Open Player #3's profile: Knife, Covert"],
    ['uk', 'Відкрити профіль гравця Alice: Knife, Таємне', 'Відкрити профіль гравця Bob: Knife, Таємне', 'Відкрити профіль гравця Гравець #3: Knife, Таємне'],
])('%s feed links name the destination and winner for loaded and live drops, with a fallback for missing users', async (language, alice, bob, fallback) => {
    await i18n.changeLanguage(language);
    getStorageLastItemsWithUserInfo.mockResolvedValue({
        status: 200, data: [drop(1), drop(3)], userList: { 1: { user_login: 'Alice' }, 3: null }, itemList: {},
    });
    const store = createStore(() => ({ itemCache: { 10: { item_name: 'Knife', item_grade: 'covert' } } }));
    render(
        <Provider store={store}>
            <MemoryRouter><HeaderThird /></MemoryRouter>
        </Provider>,
    );

    expect(await screen.findByRole('link', { name: alice })).toHaveAttribute('href', '/profile/1');
    expect(screen.getByRole('link', { name: fallback })).toHaveAttribute('href', '/profile/3');
    const onDrop = socket.on.mock.calls.find(([event]) => event === 'new-drop')[1];
    act(() => onDrop({ ...drop(2), user_login: 'Bob' }));
    expect(screen.getByRole('link', { name: bob })).toHaveAttribute('href', '/profile/2');
});
