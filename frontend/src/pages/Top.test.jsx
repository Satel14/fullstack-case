import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, combineReducers } from 'redux';
import usersReducer from '../store/reducers/user';
import Top from './Top';

jest.mock('react-i18next', () => {
    const mockReact = require('react');
    const t = (key) => key;
    return {
        useTranslation: () => ({ t }),
        withTranslation: () => (Component) => (props) => mockReact.createElement(Component, { ...props, t }),
        initReactI18next: { type: '3rdParty', init: () => {} },
    };
});

jest.mock('../api/all/storage', () => ({ getStorageTop: jest.fn() }));
jest.mock('../components/mini/openNotification', () => ({ __esModule: true, default: jest.fn() }));

const { getStorageTop } = require('../api/all/storage');
const openNotification = require('../components/mini/openNotification').default;

const players = (from, count) => Array.from({ length: count }, (_, i) => ({
    info: {
        user_id: from + i, user_login: `player${from + i}`, user_avatar: 1, created_at: '2026-10-01T10:00:00Z',
    },
    count: 100 - from - i,
}));

const renderTop = () => render(
    <Provider store={createStore(combineReducers({ user: usersReducer }))}>
        <MemoryRouter>
            <Top />
        </MemoryRouter>
    </Provider>,
);

const shownPlayers = () => Array.from(document.querySelectorAll('.nickname-cell')).map((cell) => cell.textContent);

beforeEach(() => {
    getStorageTop.mockReset();
    openNotification.mockReset();
});

test('when the leaderboard cannot be loaded the page says so instead of calling it empty, and loads it on retry', async () => {
    getStorageTop.mockRejectedValueOnce({ error: 500 }).mockResolvedValueOnce({ data: players(1, 3) });
    renderTop();

    expect(await screen.findByText('common.loadFailed')).toBeInTheDocument();
    expect(screen.queryByText('top.empty')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /common\.retry/ }));

    await waitFor(() => expect(shownPlayers()).toEqual(['player1', 'player2', 'player3']));
    expect(screen.queryByText('common.loadFailed')).toBeNull();
});

test('a failed "load more" says so and keeps the button, so the next page can still be loaded', async () => {
    getStorageTop
        .mockResolvedValueOnce({ data: players(1, 10) })
        .mockRejectedValueOnce({ error: 500 })
        .mockResolvedValueOnce({ data: players(11, 5) });
    renderTop();
    await waitFor(() => expect(shownPlayers()).toHaveLength(10));

    fireEvent.click(screen.getByRole('button', { name: /top\.loadMore/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'common.loadFailed'));
    expect(shownPlayers()).toHaveLength(10);
    const loadMore = screen.getByRole('button', { name: /top\.loadMore/ });

    fireEvent.click(loadMore);

    await waitFor(() => expect(shownPlayers()).toHaveLength(15));
    expect(getStorageTop).toHaveBeenLastCalledWith(10, 10);
    expect(screen.queryByRole('button', { name: /top\.loadMore/ })).toBeNull();
});
