import { put, get } from '../fetch';

const editProfile = (fields) => put('/profile/edit', {
    ...fields,
}, true);

const profileIsOnline = () => put('/profile/online', {});
const resetProfile = () => get('/profile/reset', {});

const sendMoneyForUser = (fields) => put('/profile/sendmoney', {
    ...fields,
}, true);

export {
    editProfile,
    profileIsOnline,
    sendMoneyForUser,
    resetProfile,
};
