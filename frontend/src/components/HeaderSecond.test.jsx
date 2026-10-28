import React from 'react';
import {
    render, act, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import usersReducer from '../store/reducers/user';
import { updateBalance } from '../store/actions/user';
import { LOGIN_USER } from '../store/types';
import HeaderSecond from './HeaderSecond';

jest.mock('react-i18next', () => ({
    withTranslation: () => (Component) => (props) => <Component {...props} t={(key) => key} />,
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('react-countup', () => ({
    __esModule: true,
    default: ({ end }) => <span data-testid="count">{end}</span>,
}));

jest.mock('../api/all/ws', () => ({
    __esModule: true, default: { on: jest.fn(), off: jest.fn() }, reconnectSocket: jest.fn(),
}));

const socket = require('../api/all/ws').default;

const socketHandlers = {};

const stats = (data) => {
    global.fetch = jest.fn(() => Promise.resolve({
        json: () => Promise.resolve({ status: 200, data }),
    }));
};

const renderHeader = (props = {}) => {
    const store = createStore(combineReducers({ user: usersReducer }), applyMiddleware(thunk));
    store.dispatch({
        type: LOGIN_USER,
        payloadUser: {
            user_id: 7, user_login: 'player', user_balance: '100.00', user_avatar: 1, user_role: 1,
        },
    });
    render(
        <Provider store={store}>
            <MemoryRouter>
                <HeaderSecond {...props} />
            </MemoryRouter>
        </Provider>,
    );
    return store;
};

const shownBalance = () => document.querySelector('.headersecond-profile__info .balance').textContent;

beforeEach(() => {
    Object.keys(socketHandlers).forEach((event) => { delete socketHandlers[event]; });
    socket.on.mockImplementation((event, handler) => { socketHandlers[event] = handler; });
    stats({
        openedCases: 1, userCounts: 2, receivedItems: 0, onlineUser: 0, onlineUserList: [],
    });
});

test('a balance reported to the header lands in the store', async () => {
    const store = renderHeader();

    act(() => { window.HeaderSecond.changeBalance('90.00'); });

    expect(store.getState().user.balance).toBe('90.00');
    expect(shownBalance()).toBe('90.00');
});

test('a store balance that equals the stale value from before an open still reaches the header', async () => {
    const store = renderHeader();

    act(() => { window.HeaderSecond.changeBalance('90.00'); });
    await act(async () => { await store.dispatch(updateBalance('100.00')); });

    expect(shownBalance()).toBe('100.00');
});

const onlineCount = () => screen.getAllByTestId('count')[3].textContent;

test('the online counter shows the number of players the server reports', async () => {
    stats({
        openedCases: 1, userCounts: 2, receivedItems: 0, onlineUser: 3, onlineUserList: [],
    });
    renderHeader();

    await waitFor(() => expect(onlineCount()).toBe('3'));
});

test('nobody online is shown as zero', async () => {
    renderHeader();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await act(async () => {});

    expect(onlineCount()).toBe('0');
});

test('the online tooltip lists the players the server reports', async () => {
    stats({
        openedCases: 1,
        userCounts: 2,
        receivedItems: 0,
        onlineUser: 2,
        onlineUserList: [
            {
                user_id: 7, user_login: 'player', user_avatar: 1, user_role: 1,
            },
            {
                user_id: 9, user_login: 'Satel7', user_avatar: 3, user_role: 10,
            },
        ],
    });
    renderHeader();
    await waitFor(() => expect(onlineCount()).toBe('2'));

    fireEvent.mouseEnter(screen.getByText('header.stats.online'));

    expect(await screen.findByText('Satel7')).toBeInTheDocument();
    expect(screen.getAllByText('player').length).toBeGreaterThan(1);
});

test('the online counter is fetched again once the own socket of the viewer connects', async () => {
    renderHeader();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(onlineCount()).toBe('0');

    stats({
        openedCases: 1, userCounts: 2, receivedItems: 0, onlineUser: 1, onlineUserList: [],
    });
    expect(socketHandlers.connect).toBeInstanceOf(Function);
    await act(async () => { socketHandlers.connect(); });

    await waitFor(() => expect(onlineCount()).toBe('1'));
});

test('a screen without the side menu gets a menu button and a way home in the header', async () => {
    const onOpenMenu = jest.fn();
    renderHeader({ onOpenMenu });
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'header.openMenu' }));

    expect(onOpenMenu).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'CASES.UA' })).toHaveAttribute('href', '/');
});

test('a screen with the side menu shows no menu button', async () => {
    renderHeader();
    await act(async () => {});

    expect(screen.queryByRole('button', { name: 'header.openMenu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'CASES.UA' })).not.toBeInTheDocument();
});

test('the deposit button keeps its name when only its icon is shown', async () => {
    renderHeader();
    await act(async () => {});

    expect(screen.getByRole('button', { name: 'header.deposit' })).toBeInTheDocument();
});

test('a guest on a screen without the side menu can sign in from the header', async () => {
    const store = createStore(combineReducers({ user: usersReducer }), applyMiddleware(thunk));
    render(
        <Provider store={store}>
            <MemoryRouter>
                <HeaderSecond onOpenMenu={() => {}} />
            </MemoryRouter>
        </Provider>,
    );
    await act(async () => {});

    expect(screen.getByRole('link', { name: 'menu.login' })).toHaveAttribute('href', '/login');
});

test('a signed-in player gets no sign-in link in the header', async () => {
    renderHeader({ onOpenMenu: () => {} });
    await act(async () => {});

    expect(screen.queryByRole('link', { name: 'menu.login' })).not.toBeInTheDocument();
});
