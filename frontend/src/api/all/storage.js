import {post, get} from '../fetch';

const sellItemByStorageId = (storageId) => get(`/storage/sell/${storageId}`);

export {
    sellItemByStorageId
}