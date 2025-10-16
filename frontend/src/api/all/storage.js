import {post, get} from '../fetch';

const sellItemByStorageId = (storageId) => get(`/storage/sell/${storageId}`);

const getStorageTop = (limit, offset) => get(`/storage/top/${limit}/${offset}`);

export {
    sellItemByStorageId,
    getStorageTop
}