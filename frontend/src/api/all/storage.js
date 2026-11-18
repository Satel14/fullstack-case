import { post, get, put } from '../fetch';
import { isSaleRate } from '../../helpers/saleRate';

const getProfileStorage = (fields) => post('/profile/storage', {
    ...fields,
});

const getStorageLastItemsByUserId = (id, limit, offset) => get(`/storage/user/${id}/${limit}/${offset}`);

const getStorageLastItems = (limit) => get(`/storage/list/${limit}`);

const getStorageLastItemsWithUserInfo = (limit) => get(`/storage/list-userinfo/${limit}`);

const getStorageItemsCountByUserId = (id) => get(`/storage/count/${id}`);

const getFavoriteCaseByUserId = (id) => get(`/storage/favorite/${id}`);

const sellItemByStorageId = (storageId, rate) => put(`/storage/sell/${storageId}`, isSaleRate(rate) ? { rate } : {});

const receiveItemByStorageId = (storageId) => put(`/storage/receive/${storageId}`, {});

const cancelWithdrawalByStorageId = (storageId) => put(`/storage/receive/${storageId}/cancel`, {});

const getStorageTop = (limit, offset) => get(`/storage/top/${limit}/${offset}`);

export {
    getProfileStorage,
    getStorageLastItems,
    getStorageLastItemsByUserId,
    getStorageItemsCountByUserId,
    getFavoriteCaseByUserId,
    sellItemByStorageId,
    receiveItemByStorageId,
    cancelWithdrawalByStorageId,
    getStorageTop,
    getStorageLastItemsWithUserInfo,
};
