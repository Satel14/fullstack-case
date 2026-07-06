import { post, get, put } from '../fetch';

const getProfileStorage = (fields) => post('/profile/storage', {
    ...fields,
}, true);

const getStorageLastItemsByUserId = (id, limit, offset) => get(`/storage/user/${id}/${limit}/${offset}`);

const getStorageLastItems = (limit) => get(`/storage/list/${limit}`);

const getStorageLastItemsWithUserInfo = (limit) => get(`/storage/list-userinfo/${limit}`);

const getStorageItemsCountByUserId = (id) => get(`/storage/count/${id}`);

const getFavoriteCaseByUserId = (id) => get(`/storage/favorite/${id}`);

const sellItemByStorageId = (storageId) => put(`/storage/sell/${storageId}`, {});

const receiveItemByStorageId = (storageId) => put(`/storage/receive/${storageId}`, {});

const getStorageTop = (limit, offset) => get(`/storage/top/${limit}/${offset}`);

export {
    getProfileStorage,
    getStorageLastItems,
    getStorageLastItemsByUserId,
    getStorageItemsCountByUserId,
    getFavoriteCaseByUserId,
    sellItemByStorageId,
    receiveItemByStorageId,
    getStorageTop,
    getStorageLastItemsWithUserInfo,
};
