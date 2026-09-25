import React from 'react';
import { render, act } from '@testing-library/react';
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

jest.mock('../api/all/ws', () => ({ __esModule: true, default: {}, reconnectSocket: jest.fn() }));

const stats = (data) => {
    global.fetch = jest.fn(() => Promise.resolve({
        json: () => Promise.resolve({ status: 200, data }),
    }));
};

const renderHeader = () => {
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
                <HeaderSecond />
            </MemoryRouter>
        </Provider>,
    );
    return store;
};

const shownBalance = () => document.querySelector('.headersecond-profile__info .balance').textContent;

beforeEach(() => {
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
