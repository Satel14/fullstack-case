import { get, post } from '../fetch';

export const getUserById = (id) => get(`/user/${id}`);

export const forgotPassword = (email) => post('/profile/forgotpassword', {
    email,
});

export const resetPassword = (token, password) => post('/profile/reset-password', {
    token,
    password,
});

export const confirmEmail = (token) => post('/profile/confirm-email', { token });
