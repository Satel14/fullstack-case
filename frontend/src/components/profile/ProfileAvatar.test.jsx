import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import usersReducer from '../../store/reducers/user';
import { LOGIN_USER } from '../../store/types';
import ProfileAvatar from './ProfileAvatar';

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

const renderPicker = () => {
    const store = createStore(combineReducers({ user: usersReducer }), applyMiddleware(thunk));
    store.dispatch({ type: LOGIN_USER, payloadUser: { user_id: 7, user_login: 'player', user_avatar: 1 } });
    const { container } = render(
        <Provider store={store}>
            <ProfileAvatar />
        </Provider>,
    );
    const checked = () => container.querySelector('input[type="radio"]:checked').value;
    return { store, checked };
};

beforeEach(() => {
    editProfile.mockReset();
    openNotification.mockReset();
});

test('a chosen avatar is selected once the server stored it', async () => {
    editProfile.mockResolvedValue({ status: 200 });
    const { store, checked } = renderPicker();

    fireEvent.click(screen.getByAltText('3 avatar'));

    await waitFor(() => expect(store.getState().user.avatar).toBe(3));
    expect(checked()).toBe('3');
});

test('an avatar the server did not store stays unselected and the failure is reported', async () => {
    editProfile.mockRejectedValue({ error: 400 });
    const { store, checked } = renderPicker();

    fireEvent.click(screen.getByAltText('3 avatar'));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'settings.avatarError'));
    expect(store.getState().user.avatar).toBe(1);
    expect(checked()).toBe('1');
});
