import { put, get, post } from '../fetch';

const editProfile = (fields) => put('/profile/edit', {
    ...fields,
});

const profileIsOnline = () => put('/profile/online', {});
const resetProfile = () => post('/profile/reset', {});

const sendMoneyForUser = (fields) => put('/profile/sendmoney', {
    ...fields,
});

const depositBalance = (amount) => post('/profile/deposit', { amount }, true);
const getDepositHistory = () => get('/profile/deposit/history');

export {
    editProfile,
    profileIsOnline,
    sendMoneyForUser,
    resetProfile,
    depositBalance,
    getDepositHistory,
};
