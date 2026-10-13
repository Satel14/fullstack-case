import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import ConfirmEmail from './ConfirmEmail';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('../../store/actions/user', () => ({ confirmEmailFetch: jest.fn() }));
jest.mock('../../components/mini/openNotification', () => ({ __esModule: true, default: jest.fn() }));

const { confirmEmailFetch } = require('../../store/actions/user');
const openNotification = require('../../components/mini/openNotification').default;

const renderPage = (search) => render(
    <Provider store={createStore(() => ({}), applyMiddleware(thunk))}>
        <MemoryRouter initialEntries={[`/confirm-email${search}`]}>
            <Switch>
                <Route path="/confirm-email" component={ConfirmEmail} />
                <Route path="/" render={() => <div>home page</div>} />
            </Switch>
        </MemoryRouter>
    </Provider>,
);

beforeEach(() => {
    confirmEmailFetch.mockImplementation(() => () => Promise.resolve({ user_login: 'newbie' }));
});

test('nothing is confirmed until the button is pressed, then the player lands home', async () => {
    renderPage(`?token=${'a'.repeat(64)}`);
    expect(confirmEmailFetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'auth.confirm.submit' }));

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(confirmEmailFetch).toHaveBeenCalledWith('a'.repeat(64));
    expect(openNotification).toHaveBeenCalledWith('success', 'auth.confirm.successTitle');
});

test('a refused link shows the server reason with ways forward', async () => {
    confirmEmailFetch.mockImplementation(() => () => Promise.reject({ error: 422, message: 'Посилання недійсне' }));
    renderPage(`?token=${'a'.repeat(64)}`);

    fireEvent.click(screen.getByRole('button', { name: 'auth.confirm.submit' }));

    expect(await screen.findByText('Посилання недійсне')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'auth.confirm.toRegister' })).toHaveAttribute('href', '/registration');
    expect(screen.getByRole('link', { name: 'auth.confirm.toLogin' })).toHaveAttribute('href', '/login');
});

test('a link without a token says so', () => {
    renderPage('');

    expect(screen.getByText('auth.confirm.missingToken')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'auth.confirm.submit' })).toBeNull();
});
