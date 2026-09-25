import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { notification } from 'antd';
import SendMoney from './SendMoney';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../api/all/profile', () => ({
    sendMoneyForUser: jest.fn(),
}));

const { sendMoneyForUser } = require('../../api/all/profile');

afterEach(() => {
    notification.destroy();
    sendMoneyForUser.mockReset();
});

const send = (amount) => {
    render(<SendMoney userIdTo={9} nickname="friend" />);
    fireEvent.click(screen.getByRole('button', { name: /sendMoney.trigger/ }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: String(amount) } });
    fireEvent.click(screen.getByRole('button', { name: 'sendMoney.transfer' }));
};

test('a rejected transfer tells the player the money was not sent', async () => {
    sendMoneyForUser.mockRejectedValue({ error: 429, message: 'too many' });

    send(25);

    await waitFor(() => expect(sendMoneyForUser).toHaveBeenCalledWith({ userIdTo: 9, money_count: 25 }));
    expect(await screen.findByText('sendMoney.failed')).toBeInTheDocument();
    expect(screen.getByText('sendMoney.failTitle')).toBeInTheDocument();
});

test('a refused transfer shows the server message', async () => {
    sendMoneyForUser.mockResolvedValue({ sended: false, message: 'Недостатньо коштів' });

    send(25);

    expect(await screen.findByText('Недостатньо коштів')).toBeInTheDocument();
    expect(screen.getByText('sendMoney.failTitle')).toBeInTheDocument();
});
