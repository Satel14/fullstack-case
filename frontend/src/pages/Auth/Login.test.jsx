import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import Login from './Login';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../store/actions/user', () => ({
    userPostFetch: jest.fn(),
}));

jest.mock('../../api/all/user', () => ({
    forgotPassword: jest.fn(),
}));

jest.mock('../../components/mini/openNotification', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const { userPostFetch } = require('../../store/actions/user');
const openNotification = require('../../components/mini/openNotification').default;

const renderForm = () => render(
    <Provider store={createStore(() => ({}), applyMiddleware(thunk))}>
        <MemoryRouter initialEntries={['/login']}>
            <Switch>
                <Route path="/login" component={Login} />
                <Route path="/" render={() => <div>home page</div>} />
            </Switch>
        </MemoryRouter>
    </Provider>,
);

const fill = ({ login = 'satel7', password = 'secret1' } = {}) => {
    fireEvent.change(screen.getByLabelText('auth.login.loginLabel'), { target: { value: login } });
    fireEvent.change(screen.getByLabelText('auth.login.passwordLabel'), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.login.submit' }));
};

beforeEach(() => {
    userPostFetch.mockImplementation(() => () => Promise.resolve(false));
});

test('empty fields are refused without logging in', async () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'auth.login.submit' }));

    expect(await screen.findByText('auth.login.loginRequired')).toBeInTheDocument();
    expect(await screen.findByText('auth.login.passwordRequired')).toBeInTheDocument();
    expect(userPostFetch).not.toHaveBeenCalled();
});

test('a short login and an old short password are left for the server to judge', async () => {
    renderForm();

    fill({ login: 'abc', password: '1234' });

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(userPostFetch).toHaveBeenCalledWith({ login: 'abc', password: '1234' }, true);
    expect(screen.queryByText('auth.login.minChars')).toBeNull();
});

test('a correct login and password logs in with the typed values and goes home', async () => {
    renderForm();

    fill({ login: 'satel7', password: 'secret1' });

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(userPostFetch).toHaveBeenCalledWith({ login: 'satel7', password: 'secret1' }, true);
    expect(openNotification).toHaveBeenCalledWith('success', 'auth.login.successTitle', 'auth.login.welcome');
});

test('"remember me" is ticked by default, and unticking it asks for a session that ends with the browser', async () => {
    renderForm();
    const remember = screen.getByRole('checkbox', { name: 'auth.login.remember' });

    expect(remember).toBeChecked();
    fireEvent.click(remember);
    fill({ login: 'satel7', password: 'secret1' });

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(userPostFetch).toHaveBeenCalledWith({ login: 'satel7', password: 'secret1' }, false);
});

test('a failed login shows the wrong-credentials message and stays on the page', async () => {
    userPostFetch.mockImplementation(() => () => Promise.resolve({ error: 401, message: 'Дані не вірні' }));
    renderForm();

    fill({ login: 'satel7', password: 'wrongpass' });

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'auth.login.errorTitle', 'auth.login.errorWrong'));
    expect(screen.queryByText('home page')).toBeNull();
});

test('a player stopped by the login limiter is told so, not that the password is wrong', async () => {
    userPostFetch.mockImplementation(() => () => Promise.resolve({ error: 429, message: 'Забагато спроб входу. Зачекайте трохи.' }));
    renderForm();

    fill();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'auth.login.errorTitle', 'Забагато спроб входу. Зачекайте трохи.',
    ));
    expect(openNotification).not.toHaveBeenCalledWith('error', 'auth.login.errorTitle', 'auth.login.errorWrong');
});

test('a server failure is reported as a server error, never with its raw text', async () => {
    userPostFetch.mockImplementation(() => () => Promise.resolve({ error: 500, message: 'ER_CON_COUNT_ERROR raw database text' }));
    renderForm();

    fill();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'auth.login.errorTitle', 'common.serverError'));
});

test('a network failure is reported and the form can be sent again', async () => {
    userPostFetch.mockImplementationOnce(() => () => Promise.reject(new TypeError('Failed to fetch')));
    renderForm();

    fill();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'auth.login.errorTitle', 'common.serverError'));
    fireEvent.click(screen.getByRole('button', { name: 'auth.login.submit' }));
    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
});
