import {
    LOGIN_USER,
    LOGOUT_USER,
    UPDATE_USER_FIELD,
} from '../types';

import { API_URL } from '../../api/config';
import userFields from '../config/userFields';
import { editProfile } from '../../api/all/profile';
import { usePromocode } from '../../api/all/other';

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

export const logoutProfile = () => (dispatch) => {
    localStorage.removeItem('token');
    dispatch(logoutUser());
    setTimeout(() => {
        window.location.href = '/';
    }, 100);
};

export const userPostRegisterFetch = (body) => (dispatch) => fetch(`${API_URL}/profile/register`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
    body: JSON.stringify(body),
})
    .then((resp) => resp.json())
    // eslint-disable-next-line promise/always-return
    .then((data) => {
        if (Object.prototype.hasOwnProperty.call(data, 'message')) {
            return data.message;
        }

        localStorage.setItem('token', data.jwt);
        dispatch(loginUser(data.user));

        return false;
    });

export const usePromocodeFetch = (code) => async (dispatch) => {
    const result = await usePromocode(code);
    if (result.balance) {
        dispatch({ type: UPDATE_USER_FIELD, payloadKey: 'balance', payloadData: result.balance });
    }
    return result;
};

export const updateBalance = (balance) => async (dispatch) => {
    dispatch({ type: UPDATE_USER_FIELD, payloadKey: 'balance', payloadData: balance });
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

export const updateProfileField = (fieldReduxName, fieldData) => (dispatch) => {
    // eslint-disable-next-line promise/catch-or-return
    let fieldRealName;

    // eslint-disable-next-line no-restricted-syntax
    for (const key in userFields) {
        if (userFields[key] === fieldReduxName) {
            fieldRealName = key;
            break;
        }
    }

    const body = { [fieldRealName]: fieldData };

    // eslint-disable-next-line promise/catch-or-return
    editProfile(body).then(() => dispatch({
        type: UPDATE_USER_FIELD,
        payloadKey: fieldReduxName,
        payloadData: fieldData,
    }));
};