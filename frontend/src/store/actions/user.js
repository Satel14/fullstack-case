import {
    LOGIN_USER,
    LOGOUT_USER,
    UPDATE_USER_FIELD,
} from '../types';

import { API_URL } from '../../api/config';
import userFields from '../config/userFields';
import { editProfile } from '../../api/all/profile';
import { redeemPromocode } from '../../api/all/other';
import { confirmEmail } from '../../api/all/user';
import { reconnectSocket } from '../../api/all/ws';

const loginUser = (user) => ({
    type: LOGIN_USER,
    payloadUser: user,
});

export const logoutUser = () => ({
    type: LOGOUT_USER,
});

const readJsonOrNull = (resp) => resp.json().catch(() => null);

const readWithStatus = async (resp) => ({ status: resp.status, data: await resp.json() });

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
            .then(async (resp) => {
                if (resp.status === 401) {
                    localStorage.removeItem('token');
                    dispatch(logoutUser());
                    return undefined;
                }
                const data = await readJsonOrNull(resp);
                if (data && data.user) {
                    dispatch(loginUser(data.user));
                }
                return undefined;
            })
            .catch(() => {});
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
    .then(readWithStatus)
    .then(({ status, data }) => {
        if (Object.prototype.hasOwnProperty.call(data, 'message')) {
            return { error: status, message: data.message };
        }
        localStorage.setItem('token', data.jwt);
        dispatch(loginUser(data.user));
        reconnectSocket();
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
    .then(async (resp) => ({ status: resp.status, data: await readJsonOrNull(resp) }))
    .then(({ status, data }) => {
        if (data && data.status === 'confirm-email') {
            return { status: 'confirm-email' };
        }
        if (!data || !data.jwt) {
            return data && typeof data.message === 'string'
                ? { error: status, message: data.message }
                : { error: status };
        }

        localStorage.setItem('token', data.jwt);
        dispatch(loginUser(data.user));
        reconnectSocket();

        return false;
    });

export const confirmEmailFetch = (token) => async (dispatch) => {
    const data = await confirmEmail(token);
    localStorage.setItem('token', data.jwt);
    dispatch(loginUser(data.user));
    reconnectSocket();
    return data.user;
};

export const redeemPromocodeFetch = (code) => async (dispatch) => {
    const result = await redeemPromocode(code);
    if (result.balance) {
        dispatch({ type: UPDATE_USER_FIELD, payloadKey: 'balance', payloadData: result.balance });
    }
    return result;
};

export const updateBalance = (balance) => async (dispatch) => {
    dispatch({ type: UPDATE_USER_FIELD, payloadKey: 'balance', payloadData: balance });
};

export const updateProfileField = (fieldReduxName, fieldData) => (dispatch) => {
    let fieldRealName;

    // eslint-disable-next-line no-restricted-syntax
    for (const key in userFields) {
        if (userFields[key] === fieldReduxName) {
            fieldRealName = key;
            break;
        }
    }

    const body = { [fieldRealName]: fieldData };

    return editProfile(body).then(() => dispatch({
        type: UPDATE_USER_FIELD,
        payloadKey: fieldReduxName,
        payloadData: fieldData,
    }));
};
