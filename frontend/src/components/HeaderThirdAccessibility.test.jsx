import React from 'react';
import {
    act, render, screen, within,
} from '@testing-library/react';
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

test.each(['en', 'uk'])('%s identifies upgrade wins in loaded and live drops while respecting an explicit case source', async (language) => {
    jest.clearAllMocks();
    await i18n.changeLanguage(language);
    getStorageLastItemsWithUserInfo.mockResolvedValue({
        status: 200,
        data: [
            { ...drop(1), source: 'upgrade', storage_caseId: 1 },
            { ...drop(2), storage_caseId: null },
            { ...drop(3), source: 'case', storage_caseId: null },
            { ...drop(4), storage_caseId: 'dust2' },
        ],
        userList: {},
        itemList: {},
    });
    const store = createStore(() => ({ itemCache: { 10: { item_name: 'Knife', item_grade: 'covert' } } }));
    render(<Provider store={store}><MemoryRouter><HeaderThird /></MemoryRouter></Provider>);

    const links = await screen.findAllByRole('link');
    const upgradeWord = language === 'en' ? /upgrade/i : /апгрейд/i;
    links.slice(0, 2).forEach((link) => {
        expect(link).toHaveAccessibleName(upgradeWord);
        expect(within(link).getByText('UP')).toBeInTheDocument();
    });
    links.slice(2).forEach((link) => {
        expect(link).not.toHaveAccessibleName(upgradeWord);
        expect(within(link).queryByText('UP')).toBeNull();
    });
    const onDrop = socket.on.mock.calls.find(([event]) => event === 'new-drop')[1];
    act(() => {
        onDrop({
 ...drop(5), source: 'upgrade', storage_caseId: null, user_login: 'Live',
});
        onDrop({ ...drop(6), storage_caseId: null, user_login: 'Legacy' });
        onDrop({
 ...drop(7), source: 'case', storage_caseId: 'dust2', user_login: 'Case',
});
    });
    ['Live', 'Legacy'].forEach((player) => {
        const link = screen.getByRole('link', { name: new RegExp(player) });
        expect(link).toHaveAccessibleName(upgradeWord);
        expect(within(link).getByText('UP')).toBeInTheDocument();
    });
    expect(within(screen.getByRole('link', { name: /Case/ })).queryByText('UP')).toBeNull();
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
