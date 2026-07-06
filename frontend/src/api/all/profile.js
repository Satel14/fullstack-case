import { put, get, post } from '../fetch';

const editProfile = (fields) => put('/profile/edit', {
    ...fields,
}, true);

const profileIsOnline = () => put('/profile/online', {});
const resetProfile = () => get('/profile/reset', {});

const sendMoneyForUser = (fields) => put('/profile/sendmoney', {
    ...fields,
}, true);

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
