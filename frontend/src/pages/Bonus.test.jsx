import React from 'react';
import {
    render, screen, fireEvent, waitFor, act, within,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import usersReducer from '../store/reducers/user';
import { LOGIN_USER } from '../store/types';
import Bonus from './Bonus';

jest.mock('react-i18next', () => ({
    withTranslation: () => (Component) => (props) => (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Component {...props} t={(key, options) => (options ? `${key} ${JSON.stringify(options)}` : key)} />
    ),
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../api/all/ws', () => ({ __esModule: true, default: {}, reconnectSocket: jest.fn() }));
jest.mock('../components/mini/openNotification', () => jest.fn());
jest.mock('../api/all/bonus', () => ({ getBonusList: jest.fn(), activateBonus: jest.fn() }));

const openNotification = require('../components/mini/openNotification');
const { getBonusList, activateBonus } = require('../api/all/bonus');

const catalogue = (overrides = {}) => [
    { id: 'daily', kind: 'daily', amount: 50, claimed: false, available: true },
    { id: 'welcome', kind: 'once', amount: 100, claimed: false, available: true },
    { id: 'receive-info', kind: 'once', amount: 50, claimed: false, available: false },
    { id: 'first-case', kind: 'once', amount: 100, claimed: false, available: false },
    { id: 'first-withdrawal', kind: 'once', amount: 200, claimed: false, available: false },
].map((bonus) => ({ ...bonus, ...(overrides[bonus.id] || {}) }));

const deferred = () => {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
};

beforeEach(() => {
    openNotification.mockReset();
    getBonusList.mockImplementation(() => Promise.resolve({ status: 200, data: catalogue() }));
    activateBonus.mockImplementation((id) => Promise.resolve({
        status: 200, balance: '100.00', bonus: catalogue().find((b) => b.id === id).amount,
    }));
});

const renderBonus = (loggedIn = true) => {
    const store = createStore(combineReducers({ user: usersReducer }), applyMiddleware(thunk));
    if (loggedIn) {
        store.dispatch({ type: LOGIN_USER, payloadUser: { user_id: 7, user_login: 'player', user_balance: '0.00' } });
    }
    render(
        <Provider store={store}>
            <MemoryRouter>
                <Bonus />
            </MemoryRouter>
        </Provider>,
    );
    return store;
};

const card = async (id) => screen.findByTestId(`bonus-${id}`);

test('a guest is asked to log in and nothing is requested', async () => {
    renderBonus(false);

    expect(await screen.findByText('bonus.loginCta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'bonus.loginButton' })).toHaveAttribute('href', '/login');
    expect(getBonusList).not.toHaveBeenCalled();
});

test('every card shows the action that fits its state', async () => {
    getBonusList.mockImplementation(() => Promise.resolve({
        status: 200,
        data: catalogue({
            daily: { claimed: true, available: false },
            welcome: { claimed: true, available: false },
            'first-case': { available: true },
        }),
    }));
    renderBonus();

    expect(within(await card('daily')).getByRole('button', { name: 'bonus.tomorrow' })).toBeDisabled();
    expect(within(await card('welcome')).getByRole('button', { name: 'bonus.claimed' })).toBeDisabled();
    expect(within(await card('first-case')).getByRole('button', { name: /bonus\.claim$/ })).not.toBeDisabled();

    const receiveInfo = await card('receive-info');
    expect(within(receiveInfo).getByRole('button', { name: /bonus\.claim$/ })).toBeDisabled();
    expect(within(receiveInfo).getByRole('link')).toHaveAttribute('href', '/settings');
    expect(within(await card('first-withdrawal')).getByRole('link')).toHaveAttribute('href', '/inventory');
    expect(within(await card('first-case')).queryByRole('link')).not.toBeInTheDocument();
});

test('claiming a bonus credits the balance and marks the card as claimed', async () => {
    const store = renderBonus();

    fireEvent.click(within(await card('welcome')).getByRole('button', { name: /bonus\.claim$/ }));

    await waitFor(() => expect(activateBonus).toHaveBeenCalledWith('welcome'));
    await waitFor(() => expect(store.getState().user.balance).toBe('100.00'));
    expect(openNotification).toHaveBeenCalledWith('success', 'bonus.credited {"amount":100}');
    expect(within(await card('welcome')).getByRole('button', { name: 'bonus.claimed' })).toBeDisabled();
});

test('a refused claim shows the server reason, an unexpected failure the generic error', async () => {
    activateBonus.mockRejectedValueOnce({ error: 422, message: 'Бонус вже отримано' });
    renderBonus();

    fireEvent.click(within(await card('welcome')).getByRole('button', { name: /bonus\.claim$/ }));
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'bonus.errorTitle', 'Бонус вже отримано'));

    activateBonus.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await waitFor(() => expect(within(screen.getByTestId('bonus-daily')).getByRole('button', { name: /bonus\.claim$/ })).not.toBeDisabled());
    fireEvent.click(within(screen.getByTestId('bonus-daily')).getByRole('button', { name: /bonus\.claim$/ }));
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'bonus.errorTitle', 'common.serverError'));
});

test('while a claim is in flight every claim button is disabled', async () => {
    const pending = deferred();
    activateBonus.mockImplementation(() => pending.promise);
    renderBonus();

    fireEvent.click(within(await card('welcome')).getByRole('button', { name: /bonus\.claim$/ }));

    await waitFor(() => expect(within(screen.getByTestId('bonus-daily')).getByRole('button', { name: /bonus\.claim$/ })).toBeDisabled());
    await act(async () => { pending.resolve({ status: 200, balance: '100.00', bonus: 100 }); });
});
