import {
    UPDATE_MMR,
    ADD_USER,
    UPDATE_USER_SETTINGS,
    LOGIN_USER,
    LOGOUT_USER,
    AUTH_MESSAGE_ERROR,
} from "../types";

import { API_URL } from './../../api/config'

export const getProfileFetch = () => {
    return (dispatch) => {
        const token = localStorage.token;
        if (token) {
            return fetch(`${API_URL}/profile/get`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
            })
                .then((resp) => resp.json())
                .then((data) => {
                    if (data.message !== "oks") {
                        localStorage.removeItem("token")
                    } else {
                        dispatch(loginUser(data.user, data.profile))
                    }
                })
        }
    }
}
export const userPostFetch = (body) => {
    return (dispatch) => {
        return fetch(`${API_URL}/profile/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(body),
        })
            .then((resp) => resp.json())
            .then((data) => {
                if (data.message === "ok") {
                    localStorage.setItem("token", data.jwt)
                    dispatch(loginUser(data.user, data.profile))
                }
                dispatch(authError(data.message))
            })
    }
}

export const userPostRegisterFetch = (body) => {
    return (dispatch) => {
        return fetch(`${API_URL}/profile/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(body),
        })
            .then((resp) => resp.json())
            .then((data) => {
                if (data.message === "ok") {
                    localStorage.setItem("token", data.jwt)
                    dispatch(loginUser(data.user, data.profile))
                }
                dispatch(authError(data.message))
            })
    }
}

const authError = (message) => ({
    type: AUTH_MESSAGE_ERROR,
    payload: message,
})

const loginUser = (user, profile) => ({
    type: LOGIN_USER,
    payload_user: user,
    payload_profile: profile,
})

export const logoutUser = () => ({
    type: LOGOUT_USER,
})

export const saveUserSettings = (params, updateData) => {
    return async (dispatch, getState) => {
        const { user } = getState();
        const copy = Object.assign({}, user.user)
        copy[param] = updateData;

        dispatchEvent({ type: UPDATE_USER_SETTINGS, payload: copy })
    }
}

export const addUserFromLayout = (user) => {
    return async (dispatch) => {
        dispatch({ type: ADD_USER, payload: user[0] })
    }
}

export const updateMMR = () => {
    return async (dispatch, getState) => {
        const { user } = getState()
        const copy = Object.assign({}, user.user[0])
        copy.old_mmr = 1000;

        dispatch({ type: UPDATE_MMR, payload: copy })
    }
}