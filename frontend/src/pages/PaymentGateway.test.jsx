import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import PaymentGateway from './PaymentGateway';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../i18n', () => ({ t: (key) => key }));

jest.mock('react-reveal/Fade', () => ({ __esModule: true, default: ({ children }) => children }));

jest.mock('../components/mini/openNotification', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('../api/token', () => ({ getToken: () => 'player-token', removeToken: () => undefined }));

const openNotification = require('../components/mini/openNotification').default;

const respond = (status, body) => Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
});

const pay = () => {
    render(
        <Provider store={createStore(() => ({}), applyMiddleware(thunk))}>
            <MemoryRouter initialEntries={[{ pathname: '/payment', state: { amount: 100 } }]}>
                <Switch>
                    <Route path="/payment" component={PaymentGateway} />
                    <Route path="/deposit" render={() => <div>deposit page</div>} />
                </Switch>
            </MemoryRouter>
        </Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'payment.pay' }));
};

beforeEach(() => {
    window.HeaderSecond = { changeBalance: jest.fn() };
});

afterEach(() => {
    delete global.fetch;
});

test('a deposit that fails on the server shows one toast, not two', async () => {
    global.fetch = jest.fn(() => respond(500, { message: 'ER_LOCK_WAIT_TIMEOUT raw text' }));

    pay();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'payment.errorTitle', 'common.serverError'));
    expect(openNotification).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'payment.pay' })).toBeInTheDocument();
});

test('a deposit the server refuses shows its reason in one toast', async () => {
    global.fetch = jest.fn(() => respond(429, { message: 'Забагато поповнень. Зачекайте трохи.' }));

    pay();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'payment.errorTitle', 'Забагато поповнень. Зачекайте трохи.'));
    expect(openNotification).toHaveBeenCalledTimes(1);
});

test('a successful deposit tops up the balance and returns to the deposit page', async () => {
    global.fetch = jest.fn(() => respond(200, { status: 200, balance: 250 }));

    pay();

    await waitFor(() => expect(screen.getByText('deposit page')).toBeInTheDocument());
    expect(window.HeaderSecond.changeBalance).toHaveBeenCalledWith(250);
    expect(openNotification).toHaveBeenCalledWith('success', 'payment.successTitle', 'payment.successText');
    expect(openNotification).toHaveBeenCalledTimes(1);
});
