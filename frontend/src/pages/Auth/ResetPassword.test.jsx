import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import ResetPassword from './ResetPassword';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../api/all/user', () => ({
    resetPassword: jest.fn(),
}));

jest.mock('../../components/mini/openNotification', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const { resetPassword } = require('../../api/all/user');
const openNotification = require('../../components/mini/openNotification').default;

const TOKEN = 'a'.repeat(64);

const renderAt = (url) => render(
    <MemoryRouter initialEntries={[url]}>
        <Switch>
            <Route path="/reset-password" component={ResetPassword} />
            <Route path="/login" render={() => <div>login page</div>} />
        </Switch>
    </MemoryRouter>,
);

const fill = (password, confirm) => {
    fireEvent.change(screen.getByLabelText('auth.reset.passwordLabel'), { target: { value: password } });
    fireEvent.change(screen.getByLabelText('auth.reset.confirmLabel'), { target: { value: confirm } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.reset.submit' }));
};

beforeEach(() => {
    resetPassword.mockReset();
    openNotification.mockReset();
});

test('a link without a token explains itself instead of showing the form', () => {
    renderAt('/reset-password');

    expect(screen.getByText('auth.reset.missingToken')).toBeInTheDocument();
    expect(screen.queryByLabelText('auth.reset.passwordLabel')).toBeNull();
});

test('mismatched passwords are refused without calling the server', async () => {
    renderAt(`/reset-password?token=${TOKEN}`);

    fill('brand-new-1', 'brand-new-2');

    await waitFor(() => expect(screen.getByText('auth.reset.mismatch')).toBeInTheDocument());
    expect(resetPassword).not.toHaveBeenCalled();
});

test('a too short password is refused without calling the server', async () => {
    renderAt(`/reset-password?token=${TOKEN}`);

    fill('12345', '12345');

    await waitFor(() => expect(screen.getByText('auth.reset.passwordLength')).toBeInTheDocument());
    expect(resetPassword).not.toHaveBeenCalled();
});

test('a successful reset sends the token and the new password, then goes to login', async () => {
    resetPassword.mockResolvedValue({ status: 200, message: 'changed' });
    renderAt(`/reset-password?token=${TOKEN}`);

    fill('brand-new-1', 'brand-new-1');

    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
    expect(resetPassword).toHaveBeenCalledWith(TOKEN, 'brand-new-1');
    expect(openNotification).toHaveBeenCalledWith('success', 'auth.reset.successTitle', 'changed');
});

test('a refused link reports the server message and stays on the page', async () => {
    resetPassword.mockRejectedValue({ error: 400, message: 'link is invalid' });
    renderAt(`/reset-password?token=${TOKEN}`);

    fill('brand-new-1', 'brand-new-1');

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'auth.reset.errorTitle', 'link is invalid'));
    expect(screen.queryByText('login page')).toBeNull();
    expect(screen.getByLabelText('auth.reset.passwordLabel')).toBeInTheDocument();
});

test('a password over 72 bytes is refused before the server, even when it is under 72 letters', async () => {
    renderAt(`/reset-password?token=${TOKEN}`);
    const cyrillic = 'пароль'.repeat(7);

    fill(cyrillic, cyrillic);

    await waitFor(() => expect(screen.getByText('auth.reset.passwordLength')).toBeInTheDocument());
    expect(resetPassword).not.toHaveBeenCalled();
});

test('a Cyrillic password within 72 bytes is accepted', async () => {
    resetPassword.mockResolvedValue({ status: 200, message: 'changed' });
    renderAt(`/reset-password?token=${TOKEN}`);
    const cyrillic = 'пароль'.repeat(6);

    fill(cyrillic, cyrillic);

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith(TOKEN, cyrillic));
});
