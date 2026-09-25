import React from 'react';
import {
    render, screen, fireEvent, waitFor, act,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import usersReducer from '../../store/reducers/user';
import { LOGIN_USER } from '../../store/types';
import ProfileReceiveInfo from './ProfileReceiveInfo';

jest.mock('react-i18next', () => ({
    withTranslation: () => (Component) => (props) => <Component {...props} t={(key) => key} />,
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../../api/all/ws', () => ({ __esModule: true, default: {}, reconnectSocket: jest.fn() }));
jest.mock('../../api/all/profile', () => ({ editProfile: jest.fn() }));
jest.mock('../mini/openNotification', () => jest.fn());

const { editProfile } = require('../../api/all/profile');
const openNotification = require('../mini/openNotification');

const renderForm = () => {
    const store = createStore(combineReducers({ user: usersReducer }), applyMiddleware(thunk));
    store.dispatch({ type: LOGIN_USER, payloadUser: { user_id: 7, user_login: 'player', user_receiveInfo: 'old link' } });
    render(
        <Provider store={store}>
            <ProfileReceiveInfo />
        </Provider>,
    );
    return store;
};

const save = (text) => {
    fireEvent.change(screen.getByPlaceholderText('receiveInfo.placeholder'), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'receiveInfo.save' }));
};

const successShown = () => openNotification.mock.calls.some(([type]) => type === 'success');

beforeEach(() => {
    editProfile.mockReset();
    openNotification.mockReset();
});

test('saved is reported only after the server stored the value', async () => {
    let finish;
    editProfile.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const store = renderForm();

    save('steam link');
    await waitFor(() => expect(editProfile).toHaveBeenCalledWith({ user_receiveInfo: 'steam link' }));

    expect(successShown()).toBe(false);

    await act(async () => { finish({ status: 200 }); });

    expect(openNotification).toHaveBeenCalledWith('success', 'receiveInfo.savedTitle');
    expect(store.getState().user.receiveInfo).toBe('steam link');
});

test.each([
    ['the server refuses it', () => Promise.reject({ error: 400 })],
    ['the server cannot be reached', () => Promise.reject(new TypeError('Failed to fetch'))],
])('a save that fails because %s is reported as an error', async (reason, response) => {
    editProfile.mockImplementation(response);
    const store = renderForm();

    save('steam link');

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'receiveInfo.errorTitle', 'receiveInfo.saveError'));
    expect(successShown()).toBe(false);
    expect(store.getState().user.receiveInfo).toBe('old link');
});
