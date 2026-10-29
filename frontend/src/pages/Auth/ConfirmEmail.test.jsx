import React from 'react';
import {
 act, render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import ConfirmEmail from './ConfirmEmail';
import { TOKEN_NOT_SAVED } from '../../api/token';

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
            <Route render={({ location }) => <div data-testid="address">{`${location.pathname}${location.search}${location.hash}`}</div>} />
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
    expect(screen.queryByRole('button', { name: 'auth.confirm.submit' })).toBeNull();
});

test.each([
    ['too many attempts', { error: 429, message: 'Забагато спроб' }, 'Забагато спроб'],
    ['a server error', { error: 500, message: 'Збій сервера' }, 'Збій сервера'],
    ['a network failure', new TypeError('Failed to fetch'), 'common.serverError'],
])('after %s the reason is shown and the button stays, so the player can try again', async (_, failure, shown) => {
    confirmEmailFetch
        .mockImplementationOnce(() => () => Promise.reject(failure))
        .mockImplementationOnce(() => () => Promise.resolve({ user_login: 'newbie' }));
    renderPage(`?token=${'a'.repeat(64)}`);

    fireEvent.click(screen.getByRole('button', { name: 'auth.confirm.submit' }));

    expect(await screen.findByText(shown)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'auth.confirm.submit' });
    await waitFor(() => expect(retry).not.toHaveClass('ant-btn-loading'));

    fireEvent.click(retry);

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(confirmEmailFetch).toHaveBeenCalledTimes(2);
});

test('a confirmation whose sign-in the browser does not let the site save says so and points to signing in', async () => {
    confirmEmailFetch.mockImplementation(() => () => Promise.reject({ error: TOKEN_NOT_SAVED }));
    renderPage(`?token=${'a'.repeat(64)}`);

    fireEvent.click(screen.getByRole('button', { name: 'auth.confirm.submit' }));

    expect(await screen.findByText('auth.tokenNotSaved')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'auth.confirm.toLogin' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', { name: 'auth.confirm.submit' })).toBeNull();
    expect(openNotification).not.toHaveBeenCalled();
    expect(screen.queryByText('home page')).toBeNull();
});

test('a link without a token says so', () => {
    renderPage('');

    expect(screen.getByText('auth.confirm.missingToken')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'auth.confirm.submit' })).toBeNull();
});

test('the token in the link fragment is confirmed and leaves the address bar at once', async () => {
    renderPage(`#token=${'b'.repeat(64)}`);

    expect(screen.getByTestId('address')).toHaveTextContent(/^\/confirm-email$/);
    fireEvent.click(screen.getByRole('button', { name: 'auth.confirm.submit' }));

    await waitFor(() => expect(confirmEmailFetch).toHaveBeenCalledWith('b'.repeat(64)));
});

test('a link mailed with ?token= still confirms, and its token leaves the address bar too', async () => {
    renderPage(`?token=${'c'.repeat(64)}`);

    expect(screen.getByTestId('address')).toHaveTextContent(/^\/confirm-email$/);
    fireEvent.click(screen.getByRole('button', { name: 'auth.confirm.submit' }));

    await waitFor(() => expect(confirmEmailFetch).toHaveBeenCalledWith('c'.repeat(64)));
});

const renderWithHistory = (path) => {
    const router = {};
    render(
        <Provider store={createStore(() => ({}), applyMiddleware(thunk))}>
            <MemoryRouter initialEntries={[path]}>
                <Switch>
                    <Route path="/confirm-email" component={ConfirmEmail} />
                    <Route path="/" render={() => <div>home page</div>} />
                </Switch>
                <Route render={({ history }) => { router.history = history; return null; }} />
            </MemoryRouter>
        </Provider>,
    );
    return router;
};

test('a fresh link opened in the same tab takes over from the incomplete one', async () => {
    const router = renderWithHistory('/confirm-email');
    expect(screen.getByText('auth.confirm.missingToken')).toBeInTheDocument();

    act(() => { router.history.push(`/confirm-email#token=${'d'.repeat(64)}`); });
    fireEvent.click(screen.getByRole('button', { name: 'auth.confirm.submit' }));

    await waitFor(() => expect(confirmEmailFetch).toHaveBeenCalledWith('d'.repeat(64)));
    expect(router.history.location.hash).toBe('');
});

test('a refused link followed by a fresh one in the same tab offers to confirm the fresh one', async () => {
    confirmEmailFetch.mockImplementationOnce(() => () => Promise.reject({ error: 422, message: 'link expired' }));
    const router = renderWithHistory(`/confirm-email#token=${'e'.repeat(64)}`);
    fireEvent.click(screen.getByRole('button', { name: 'auth.confirm.submit' }));
    expect(await screen.findByText('link expired')).toBeInTheDocument();

    act(() => { router.history.push(`/confirm-email#token=${'f'.repeat(64)}`); });
    fireEvent.click(screen.getByRole('button', { name: 'auth.confirm.submit' }));

    await waitFor(() => expect(confirmEmailFetch).toHaveBeenLastCalledWith('f'.repeat(64)));
});
