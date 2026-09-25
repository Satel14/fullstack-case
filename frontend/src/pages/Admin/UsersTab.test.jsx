import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import UsersTab from './UsersTab';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../api/all/admin', () => ({
    getAdminUsers: jest.fn(),
    setUserRole: jest.fn(),
    adjustUserBalance: jest.fn(),
}));

jest.mock('../../components/mini/openNotification', () => jest.fn());

const { getAdminUsers, setUserRole } = require('../../api/all/admin');
const openNotification = require('../../components/mini/openNotification');

const player = {
    user_id: 7, user_login: 'peer', user_email: 'peer@e.ua', user_balance: '0.00', user_role: 1,
};

test('a refused role change shows the reason the server gave and reloads the list', async () => {
    const reason = 'Роль іншого адміністратора не можна змінити через панель';
    getAdminUsers.mockResolvedValue({ data: [player], count: 1 });
    setUserRole.mockRejectedValue({ error: 422, message: reason });
    const store = createStore(() => ({ user: { id: 1 } }));

    render(
        <Provider store={store}>
            <UsersTab />
        </Provider>,
    );

    await screen.findByText('peer');
    fireEvent.mouseDown(document.querySelector('.ant-select-selector'));
    fireEvent.click(await screen.findByText('profile.roles.banned'));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'admin.users.roleFailed', reason));
    expect(setUserRole).toHaveBeenCalledWith(7, -1);
    await waitFor(() => expect(getAdminUsers).toHaveBeenCalledTimes(2));
});
