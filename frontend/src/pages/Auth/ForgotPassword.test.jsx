import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import ForgotPassword from './ForgotPassword';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../api/all/user', () => ({
    forgotPassword: jest.fn(),
}));

jest.mock('../../components/mini/openNotification', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const { forgotPassword } = require('../../api/all/user');
const openNotification = require('../../components/mini/openNotification').default;

const openModal = () => {
    render(<ForgotPassword />);
    fireEvent.click(screen.getByRole('button', { name: 'auth.forgot.trigger' }));
};

beforeEach(() => {
    forgotPassword.mockReset();
    openNotification.mockReset();
});

test('an empty email is refused without calling the server', async () => {
    openModal();

    fireEvent.click(screen.getByRole('button', { name: 'auth.forgot.ok' }));

    await waitFor(() => expect(screen.getByText('auth.forgot.emailRequired')).toBeInTheDocument());
    expect(forgotPassword).not.toHaveBeenCalled();
});

test('an invalid email is refused without calling the server', async () => {
    openModal();

    fireEvent.change(screen.getByLabelText('auth.forgot.emailLabel'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.forgot.ok' }));

    await waitFor(() => expect(screen.getByText('auth.forgot.emailInvalid')).toBeInTheDocument());
    expect(forgotPassword).not.toHaveBeenCalled();
});

test('a valid email calls the server and shows its answer', async () => {
    forgotPassword.mockResolvedValue({ status: 'sended', message: 'лист надіслано' });
    openModal();

    fireEvent.change(screen.getByLabelText('auth.forgot.emailLabel'), { target: { value: 'player@e.ua' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.forgot.ok' }));

    await waitFor(() => expect(forgotPassword).toHaveBeenCalledWith('player@e.ua'));
    expect(openNotification).toHaveBeenCalledWith('success', 'auth.forgot.successTitle', 'лист надіслано');
});

test('a mail-unavailable (503) answer shows its message', async () => {
    forgotPassword.mockRejectedValue({ error: 503, message: 'Відправлення листів тимчасово недоступне' });
    openModal();

    fireEvent.change(screen.getByLabelText('auth.forgot.emailLabel'), { target: { value: 'player@e.ua' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.forgot.ok' }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'auth.forgot.errorTitle', 'Відправлення листів тимчасово недоступне'));
});
