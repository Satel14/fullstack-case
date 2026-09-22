import { ADD_ITEMS_CACHE } from '../types';
import { getItemInfoById } from '../../api/all/item';

const pending = new Map();

const placeholderItem = (id) => ({
    item_itemId: id,
    item_name: `Item ${id}`,
    item_rare: 'Factory New',
    item_type: 'Unknown',
});

export const addItemsToCache = (itemList) => (dispatch) => {
    Object.entries(itemList || {}).forEach(([id, itemInfo]) => {
        if (itemInfo) {
            dispatch({ type: ADD_ITEMS_CACHE, payloadKey: id, payloadData: itemInfo });
        }
    });
};

export const itemInfoFetch = (id) => (dispatch, getState) => {
    const { itemCache } = getState();

    if (itemCache[id]) {
        return Promise.resolve(itemCache[id]);
    }
    if (pending.has(id)) {
        return pending.get(id);
    }

    const request = getItemInfoById(id)
        .then((result) => result.data)
        .catch(() => placeholderItem(id))
        .then((itemInfo) => {
            dispatch({ type: ADD_ITEMS_CACHE, payloadKey: id, payloadData: itemInfo });
            return itemInfo;
        })
        .finally(() => {
            pending.delete(id);
        });

    pending.set(id, request);
    return request;
};
