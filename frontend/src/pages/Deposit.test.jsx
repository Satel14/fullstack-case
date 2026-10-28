import React from 'react';
import {
    render, screen, fireEvent, act,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, combineReducers } from 'redux';
import usersReducer from '../store/reducers/user';
import Deposit from './Deposit';

jest.mock('react-i18next', () => {
    const mockReact = require('react');
    const t = (key) => key;
    return {
        useTranslation: () => ({ t }),
        withTranslation: () => (Component) => (props) => mockReact.createElement(Component, { ...props, t }),
        initReactI18next: { type: '3rdParty', init: () => {} },
    };
});

jest.mock('react-reveal/Fade', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('../api/all/profile', () => ({ getDepositHistory: jest.fn() }));

const { getDepositHistory } = require('../api/all/profile');

const renderDeposit = () => render(
    <Provider store={createStore(combineReducers({ user: usersReducer }))}>
        <MemoryRouter>
            <Deposit history={{ push: jest.fn() }} />
        </MemoryRouter>
    </Provider>,
);

beforeEach(() => {
    getDepositHistory.mockReset();
});

test('when the deposit history cannot be loaded the tab says so instead of claiming there were no deposits, and loads it on retry', async () => {
    getDepositHistory
        .mockRejectedValueOnce({ error: 500 })
        .mockResolvedValueOnce({ data: [{ history_id: 1, created_at: '2026-10-01T10:00:00Z', history_change: 50 }] });
    renderDeposit();

    fireEvent.click(screen.getByText('deposit.tabHistory'));

    expect(await screen.findByText('common.loadFailed')).toBeInTheDocument();
    expect(screen.queryByText('deposit.historyEmpty')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /common\.retry/ }));

    expect(await screen.findByText('deposit.historyAmount')).toBeInTheDocument();
    expect(screen.queryByText('common.loadFailed')).toBeNull();
});

test('a player without deposits is told the history is empty', async () => {
    getDepositHistory.mockResolvedValueOnce({ data: [] });
    renderDeposit();

    fireEvent.click(screen.getByText('deposit.tabHistory'));

    expect(await screen.findByText('deposit.historyEmpty')).toBeInTheDocument();
    expect(screen.queryByText('common.loadFailed')).toBeNull();
});

test('leaving the page before the history arrives updates nothing', async () => {
    let answer;
    getDepositHistory.mockImplementationOnce(() => new Promise((resolve) => { answer = resolve; }));
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderDeposit();

    unmount();
    await act(async () => { answer({ data: [] }); });

    expect(errors.mock.calls.filter(([message]) => String(message).includes('unmounted component'))).toEqual([]);
    errors.mockRestore();
});

test('the promocode button leads to the promocode page and is not part of the tab bar', () => {
    const push = jest.fn();
    render(
        <Provider store={createStore(combineReducers({ user: usersReducer }))}>
            <MemoryRouter>
                <Deposit history={{ push }} />
            </MemoryRouter>
        </Provider>,
    );

    const button = screen.getByRole('button', { name: 'deposit.promocodeBtn' });
    expect(button.closest('.ant-tabs-nav')).toBeNull();

    fireEvent.click(button);

    expect(push).toHaveBeenCalledWith('/promocode');
});
