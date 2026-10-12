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

const logIn = (store) => store.dispatch({
    type: LOGIN_USER, payloadUser: { user_id: 7, user_login: 'player', user_balance: '0.00' },
});

const renderBonus = (loggedIn = true, history = { push: jest.fn() }) => {
    const store = createStore(combineReducers({ user: usersReducer }), applyMiddleware(thunk));
    if (loggedIn) {
        logIn(store);
    }
    render(
        <Provider store={store}>
            <MemoryRouter>
                <Bonus history={history} />
            </MemoryRouter>
        </Provider>,
    );
    return store;
};

const card = async (id) => screen.findByTestId(`bonus-${id}`);

test('a guest is asked to log in and nothing is requested', async () => {
    const history = { push: jest.fn() };
    renderBonus(false, history);

    expect(await screen.findByText('bonus.loginCta')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'bonus.loginButton' }));
    expect(history.push).toHaveBeenCalledWith('/login');
    expect(getBonusList).not.toHaveBeenCalled();
});

test('a player whose profile arrives after the page mounted sees the loader, then the bonuses', async () => {
    const list = deferred();
    getBonusList.mockImplementation(() => list.promise);
    const store = renderBonus(false);

    act(() => { logIn(store); });

    await waitFor(() => expect(getBonusList).toHaveBeenCalled());
    expect(document.querySelector('.loader')).not.toBeNull();
    await act(async () => { list.resolve({ status: 200, data: catalogue() }); });
    expect(await card('welcome')).toBeInTheDocument();
});

test('a list that fails to load offers a retry', async () => {
    getBonusList.mockImplementationOnce(() => Promise.reject({ error: 500 }));
    renderBonus();

    fireEvent.click(await screen.findByRole('button', { name: /bonus\.retry$/ }));

    expect(await card('welcome')).toBeInTheDocument();
    expect(getBonusList).toHaveBeenCalledTimes(2);
});

test('a bonus the page has no text for is not shown', async () => {
    getBonusList.mockImplementation(() => Promise.resolve({
        status: 200,
        data: [...catalogue(), { id: 'new-thing', kind: 'once', amount: 5, claimed: false, available: true }],
    }));
    renderBonus();

    expect(await card('welcome')).toBeInTheDocument();
    expect(screen.queryByTestId('bonus-new-thing')).not.toBeInTheDocument();
});

test('coming back to the page refreshes the list, so a new day shows the daily bonus again', async () => {
    getBonusList.mockImplementationOnce(() => Promise.resolve({
        status: 200, data: catalogue({ daily: { claimed: true, available: false } }),
    }));
    renderBonus();
    expect(within(await card('daily')).getByRole('button', { name: 'bonus.tomorrow' })).toBeDisabled();

    act(() => { window.dispatchEvent(new Event('focus')); });

    await waitFor(() => expect(within(screen.getByTestId('bonus-daily')).getByRole('button', { name: /bonus\.claim$/ })).not.toBeDisabled());
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

    activateBonus.mockRejectedValueOnce({ error: 500, message: 'ER_LOCK_DEADLOCK raw database text' });
    await waitFor(() => expect(within(screen.getByTestId('bonus-daily')).getByRole('button', { name: /bonus\.claim$/ })).not.toBeDisabled());
    fireEvent.click(within(screen.getByTestId('bonus-daily')).getByRole('button', { name: /bonus\.claim$/ }));
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'bonus.errorTitle', 'common.serverError'));
    await waitFor(() => expect(getBonusList).toHaveBeenCalledTimes(3));
});

test('while a claim is in flight every claim button is disabled', async () => {
    const pending = deferred();
    activateBonus.mockImplementation(() => pending.promise);
    renderBonus();

    fireEvent.click(within(await card('welcome')).getByRole('button', { name: /bonus\.claim$/ }));

    await waitFor(() => expect(within(screen.getByTestId('bonus-daily')).getByRole('button', { name: /bonus\.claim$/ })).toBeDisabled());
    await act(async () => { pending.resolve({ status: 200, balance: '100.00', bonus: 100 }); });
});

test('a refresh that answers after a claim does not re-enable the claimed card', async () => {
    renderBonus();
    await card('welcome');
    const stale = deferred();
    getBonusList.mockImplementationOnce(() => stale.promise);

    act(() => { window.dispatchEvent(new Event('focus')); });
    fireEvent.click(within(screen.getByTestId('bonus-welcome')).getByRole('button', { name: /bonus\.claim$/ }));
    await waitFor(() => expect(within(screen.getByTestId('bonus-welcome')).getByRole('button', { name: 'bonus.claimed' })).toBeDisabled());

    await act(async () => { stale.resolve({ status: 200, data: catalogue() }); });

    expect(within(screen.getByTestId('bonus-welcome')).getByRole('button', { name: 'bonus.claimed' })).toBeDisabled();
});

test('a refresh that fails after a newer one succeeded keeps the list', async () => {
    renderBonus();
    await card('welcome');
    const slowFailure = deferred();
    getBonusList.mockImplementationOnce(() => slowFailure.promise.then(() => Promise.reject({ error: 500 })));

    act(() => { window.dispatchEvent(new Event('focus')); });
    act(() => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(getBonusList).toHaveBeenCalledTimes(3));
    await act(async () => { slowFailure.resolve(); });

    expect(screen.getByTestId('bonus-welcome')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /bonus\.retry$/ })).not.toBeInTheDocument();
});

test('a refresh that starts while a claim is in flight does not re-enable the claimed card', async () => {
    renderBonus();
    await card('welcome');
    const claimAnswer = deferred();
    activateBonus.mockImplementationOnce(() => claimAnswer.promise);
    const stale = deferred();
    getBonusList.mockImplementationOnce(() => stale.promise);

    fireEvent.click(within(screen.getByTestId('bonus-welcome')).getByRole('button', { name: /bonus\.claim$/ }));
    act(() => { window.dispatchEvent(new Event('focus')); });
    await act(async () => { claimAnswer.resolve({ status: 200, balance: '100.00', bonus: 100 }); });
    await act(async () => { stale.resolve({ status: 200, data: catalogue() }); });

    expect(within(screen.getByTestId('bonus-welcome')).getByRole('button', { name: 'bonus.claimed' })).toBeDisabled();
});

test('retry pressed while a claim is in flight still leaves the loader once the claim succeeds', async () => {
    getBonusList.mockImplementationOnce(() => Promise.resolve({ status: 200, data: catalogue() }));
    renderBonus();
    await card('welcome');
    const claimAnswer = deferred();
    activateBonus.mockImplementationOnce(() => claimAnswer.promise);
    getBonusList.mockImplementationOnce(() => Promise.reject({ error: 500 }));

    fireEvent.click(within(screen.getByTestId('bonus-welcome')).getByRole('button', { name: /bonus\.claim$/ }));
    act(() => { window.dispatchEvent(new Event('focus')); });
    fireEvent.click(await screen.findByRole('button', { name: /bonus\.retry$/ }));
    await act(async () => { claimAnswer.resolve({ status: 200, balance: '100.00', bonus: 100 }); });

    await waitFor(() => expect(document.querySelector('.loader')).toBeNull());
});
