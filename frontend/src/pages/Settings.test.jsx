import React from 'react';
import {
    render, screen, fireEvent, waitFor, act,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import {
    createStore, combineReducers, applyMiddleware,
} from 'redux';
import thunk from 'redux-thunk';
import { Modal, notification } from 'antd';
import usersReducer from '../store/reducers/user';
import { updateBalance } from '../store/actions/user';
import { LOGIN_USER } from '../store/types';
import Settings from './Settings';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
    // eslint-disable-next-line react/jsx-props-no-spreading
    withTranslation: () => (Component) => (props) => <Component {...props} t={(key) => key} />,
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../api/all/ws', () => ({ __esModule: true, default: {}, reconnectSocket: jest.fn() }));
jest.mock('../components/profile/ProfileAvatar', () => () => null);
jest.mock('../components/profile/Promocode', () => () => null);
jest.mock('../components/profile/ProfileReceiveInfo', () => () => null);
jest.mock('../components/inventory/InventoryHistory', () => () => null);

jest.mock('../api/all/profile', () => ({
    resetProfile: jest.fn(),
}));

const { resetProfile } = require('../api/all/profile');

const originalLocation = window.location;

beforeEach(() => {
    delete window.location;
    window.location = { reload: jest.fn() };
});

afterEach(async () => {
    window.location = originalLocation;
    Modal.destroyAll();
    await waitFor(() => expect(document.querySelector('.ant-modal-confirm')).toBeNull());
    notification.destroy();
    resetProfile.mockReset();
});

const renderSettings = () => {
    const store = createStore(() => ({
        user: {
            id: 3, login: 'player', email: 'p@example.com', balance: '10.00',
        },
    }));
    render(
        <Provider store={store}>
            <Settings history={{ push: jest.fn() }} />
        </Provider>,
    );
};

const clickReset = () => {
    fireEvent.click(screen.getByText('settings.resetBtn').closest('button'));
};

test('the balance field follows the balance in the store', async () => {
    const store = createStore(combineReducers({ user: usersReducer }), applyMiddleware(thunk));
    store.dispatch({
        type: LOGIN_USER,
        payloadUser: {
            user_id: 7, user_login: 'player', user_email: 'p@example.com', user_balance: '100.00',
        },
    });
    const { container } = render(
        <Provider store={store}>
            <Settings history={{ push: jest.fn() }} />
        </Provider>,
    );
    const balanceInput = () => container.querySelector('.ant-input[style*="max-width"]');

    expect(balanceInput().value).toBe('100.00');

    await act(async () => { await store.dispatch(updateBalance('90.00')); });

    expect(balanceInput().value).toBe('90.00');
});

test('the reset button asks for confirmation and a cancel leaves the profile alone', async () => {
    renderSettings();

    clickReset();

    expect(await screen.findByText('settings.resetConfirmTitle')).toBeInTheDocument();
    expect(screen.getByText('settings.resetConfirmText')).toBeInTheDocument();
    expect(resetProfile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'settings.resetConfirmCancel' }));

    await waitFor(() => expect(screen.queryByText('settings.resetConfirmTitle')).not.toBeInTheDocument());
    expect(resetProfile).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();
});

test('confirming resets the profile and reloads the page', async () => {
    resetProfile.mockResolvedValue({ status: 200 });
    renderSettings();

    clickReset();
    fireEvent.click(await screen.findByRole('button', { name: 'settings.resetConfirmOk' }));

    await waitFor(() => expect(window.location.reload).toHaveBeenCalled());
    expect(resetProfile).toHaveBeenCalledTimes(1);
});

test('a failed reset is reported and the page is not reloaded', async () => {
    resetProfile.mockRejectedValue({ error: 500 });
    renderSettings();

    clickReset();
    fireEvent.click(await screen.findByRole('button', { name: 'settings.resetConfirmOk' }));

    expect(await screen.findByText('settings.resetFailed')).toBeInTheDocument();
    expect(window.location.reload).not.toHaveBeenCalled();
});
