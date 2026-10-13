import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import Registration from './Registration';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../store/actions/user', () => ({
    userPostRegisterFetch: jest.fn(),
}));

jest.mock('../../components/mini/openNotification', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const { userPostRegisterFetch } = require('../../store/actions/user');
const openNotification = require('../../components/mini/openNotification').default;

const renderForm = () => render(
    <Provider store={createStore(() => ({}), applyMiddleware(thunk))}>
        <MemoryRouter initialEntries={['/registration']}>
            <Switch>
                <Route path="/registration" component={Registration} />
                <Route path="/" render={() => <div>home page</div>} />
            </Switch>
        </MemoryRouter>
    </Provider>,
);

const fill = ({
    login = 'newbie', password = 'secret123', confirm = password, email = 'newbie@e.ua',
} = {}) => {
    fireEvent.change(screen.getByLabelText('auth.register.loginLabel'), { target: { value: login } });
    fireEvent.change(screen.getByLabelText('auth.register.passwordLabel'), { target: { value: password } });
    fireEvent.change(screen.getByLabelText('auth.register.confirmLabel'), { target: { value: confirm } });
    fireEvent.change(screen.getByLabelText('auth.register.emailLabel'), { target: { value: email } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'auth.register.submit' }));
};

beforeEach(() => {
    userPostRegisterFetch.mockReset();
    openNotification.mockReset();
    userPostRegisterFetch.mockImplementation(() => () => Promise.resolve(false));
});

const submitButton = () => screen.getByRole('button', { name: /auth\.register\.submit/ });

test('a network failure stops the spinner, says the server failed, and the form can be sent again', async () => {
    userPostRegisterFetch.mockImplementationOnce(() => () => Promise.reject(new TypeError('Failed to fetch')));
    renderForm();

    fill();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'auth.register.errorTitle', 'common.serverError'));
    expect(submitButton()).not.toHaveClass('ant-btn-loading');
    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
});

test('an answer without a readable body stops the spinner and says the server failed', async () => {
    userPostRegisterFetch.mockImplementation(() => () => Promise.resolve({ error: 502 }));
    renderForm();

    fill();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'auth.register.errorTitle', 'common.serverError'));
    expect(submitButton()).not.toHaveClass('ant-btn-loading');
    expect(screen.queryByText('home page')).toBeNull();
});

test('a server failure is reported as a server error, never with its raw text', async () => {
    userPostRegisterFetch.mockImplementation(() => () => Promise.resolve({ error: 500, message: 'ER_DUP_ENTRY raw database text' }));
    renderForm();

    fill();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'auth.register.errorTitle', 'common.serverError'));
    expect(openNotification).not.toHaveBeenCalledWith('error', 'auth.register.errorTitle', 'ER_DUP_ENTRY raw database text');
});

test('a refused registration shows the reason the server gave', async () => {
    userPostRegisterFetch.mockImplementation(() => () => Promise.resolve({ error: 422, message: 'Такий логін уже зайнятий' }));
    renderForm();

    fill();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'auth.register.errorTitle', 'Такий логін уже зайнятий'));
    expect(screen.queryByText('home page')).toBeNull();
});

test('a too short password is refused without registering', async () => {
    renderForm();

    fill({ password: '12345' });

    await waitFor(() => expect(screen.getByText('auth.register.passwordLength')).toBeInTheDocument());
    expect(userPostRegisterFetch).not.toHaveBeenCalled();
});

test('a password over 72 bytes is refused, even when it is under 72 letters', async () => {
    renderForm();

    fill({ password: 'пароль'.repeat(7) });

    await waitFor(() => expect(screen.getByText('auth.register.passwordLength')).toBeInTheDocument());
    expect(userPostRegisterFetch).not.toHaveBeenCalled();
});

test('a form within the rules registers with the typed values and goes home', async () => {
    renderForm();
    const password = 'пароль'.repeat(6);

    fill({ password });

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(userPostRegisterFetch).toHaveBeenCalledWith({
        login: 'newbie', password, email: 'newbie@e.ua', avatar: 1,
    });
});

test.each([
    ['Satel7 '],
    ['\u0405atel7'],
    ['гравець'],
    ['ab'],
    ['a'.repeat(33)],
])('the login %j is refused without registering', async (login) => {
    renderForm();

    fill({ login });

    await waitFor(() => expect(screen.getByText('auth.register.loginInvalid')).toBeInTheDocument());
    expect(userPostRegisterFetch).not.toHaveBeenCalled();
});

test('a login of Latin letters, digits, dots, hyphens and underscores registers', async () => {
    renderForm();

    fill({ login: 'New_player.1-x' });

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(userPostRegisterFetch).toHaveBeenCalledWith(expect.objectContaining({ login: 'New_player.1-x' }));
});

test('the email is sent without surrounding spaces', async () => {
    renderForm();

    fill({ email: '  newbie@e.ua  ' });

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(userPostRegisterFetch).toHaveBeenCalledWith(expect.objectContaining({ email: 'newbie@e.ua' }));
});

test.each([
    ['not-an-email'],
    ['a@b'],
    ['a b@e.ua'],
    ['a@e.ua\u202E'],
    [`${'x'.repeat(250)}@e.ua`],
    ['\u00F6wner@e.ua'],
    ['x<victim@y.z>'],
    ['"quoted"@e.ua'],
    ['a,b@e.ua'],
    ['a@[127.0.0.1]'],
    ['a@e..ua'],
])('the email %j is refused without registering', async (email) => {
    renderForm();

    fill({ email });

    await waitFor(() => expect(screen.getByText('auth.register.emailInvalid')).toBeInTheDocument());
    expect(userPostRegisterFetch).not.toHaveBeenCalled();
});

test.each([
    ['name.surname+tag@sub.example.co.uk'],
    ['player@xn--80ak6aa92e.com'],
    ["o'brien@e.ua"],
])('the email %j registers', async (email) => {
    renderForm();

    fill({ email });

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(userPostRegisterFetch).toHaveBeenCalledWith(expect.objectContaining({ email }));
});

test('the site rules open in a new tab, so the filled form is not lost', () => {
    renderForm();

    const rules = screen.getByRole('link', { name: 'auth.register.agreementLink' });

    expect(rules).toHaveAttribute('href', '/article/6');
    expect(rules).toHaveAttribute('target', '_blank');
    expect(rules.getAttribute('rel')).toContain('noopener');
});

test('a registration that needs confirming shows where the link went and signs nobody in', async () => {
    userPostRegisterFetch.mockImplementation(() => () => Promise.resolve({ status: 'confirm-email' }));
    renderForm();

    fill();

    expect(await screen.findByText('auth.confirm.sentTitle')).toBeInTheDocument();
    expect(screen.getByText('auth.confirm.sentText')).toBeInTheDocument();
    expect(screen.queryByText('home page')).toBeNull();
    expect(screen.queryByRole('button', { name: 'auth.register.submit' })).toBeNull();
});
