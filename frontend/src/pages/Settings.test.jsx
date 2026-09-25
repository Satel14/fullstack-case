import React from 'react';
import { render, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import usersReducer from '../store/reducers/user';
import { updateBalance } from '../store/actions/user';
import { LOGIN_USER } from '../store/types';
import Settings from './Settings';

jest.mock('react-i18next', () => ({
    withTranslation: () => (Component) => (props) => <Component {...props} t={(key) => key} />,
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../api/all/ws', () => ({ __esModule: true, default: {}, reconnectSocket: jest.fn() }));
jest.mock('../components/profile/ProfileAvatar', () => () => null);
jest.mock('../components/profile/Promocode', () => () => null);
jest.mock('../components/profile/ProfileReceiveInfo', () => () => null);
jest.mock('../components/inventory/InventoryHistory', () => () => null);

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
