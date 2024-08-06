import {
    LOGIN_USER,
    LOGOUT_USER,
} from '../types';

import { API_URL } from '../../api/config';

const loginUser = (user) => ({
    type: LOGIN_USER,
    payloadUser: user,
});

export const logoutUser = () => ({
    type: LOGOUT_USER,
});

export const getProfileFetch = () => (dispatch) => {
    const { token } = localStorage;
    if (token) {
        return fetch(`${API_URL}/profile/get`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
            },
        })
            .then((resp) => resp.json())
            // eslint-disable-next-line promise/always-return
            .then((data) => {
                dispatch(loginUser(data.user));
            });
    }

    return null;
};

export const userPostFetch = (body) => (dispatch) => fetch(`${API_URL}/profile/login`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
    body: JSON.stringify(body),
})
    .then((resp) => resp.json())
    .then((data) => {
        if (Object.prototype.hasOwnProperty.call(data, 'message')) {
            return data.message;
        }
        localStorage.setItem('token', data.jwt);
        dispatch(loginUser(data.user));
        return false;
    });

export const userPostRegisterFetch = (body) => (dispatch) => fetch(`${API_URL}/profile/register`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
    body: JSON.stringify(body),
})
    .then((resp) => resp.json())
    .then((data) => {
        if ((Object.prototype.hasOwnProperty.call(data, 'message'))) {
            return data.message;
        }
        localStorage.setItem('token', data.jwt);
        dispatch(loginUser(data.user));
    });

export const logoutProfile = () => (dispatch) => {
    localStorage.removeItem('token');
    dispatch(logoutUser());
};

// export const saveUserSettings = (params, updateData) => async (dispatch, getState) => {
//     const { user } = getState();
//     const copy = { ...user.user };
//     copy[param] = updateData;
//
//     dispatchEvent({ type: UPDATE_USER_SETTINGS, payload: copy });
// };

// export const addUserFromLayout = (user) => async (dispatch) => {
//     dispatch({ type: ADD_USER, payload: user[0] });
// };
