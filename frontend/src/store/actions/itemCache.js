import { ADD_ITEMS_CACHE } from '../types';
import { getItemsInfo } from '../../api/all/item';

const ITEMS_PER_REQUEST = 200;
const ITEM_ID = /^[1-9]\d{0,9}$/;

const pending = new Map();
let queue = [];

const placeholderItem = (id) => ({
    item_itemId: id,
    item_name: `Item ${id}`,
    item_rare: 'Factory New',
    item_type: 'Unknown',
});

const fetchKnownItems = async (ids) => {
    if (!ids.length) {
        return {};
    }
    try {
        const result = await getItemsInfo(ids);
        return (result && result.data) || {};
    } catch (e) {
        return {};
    }
};

const requestBatch = async (entries) => {
    const ids = [...new Set(entries.map((entry) => String(entry.id)))].filter((id) => ITEM_ID.test(id));
    const found = await fetchKnownItems(ids);
    entries.forEach(({ id, resolve }) => resolve(found[id] || placeholderItem(id)));
};

const flush = () => {
    const entries = queue;
    queue = [];
    for (let start = 0; start < entries.length; start += ITEMS_PER_REQUEST) {
        requestBatch(entries.slice(start, start + ITEMS_PER_REQUEST));
    }
};

const enqueue = (id) => new Promise((resolve) => {
    if (!queue.length) {
        Promise.resolve().then(flush);
    }
    queue.push({ id, resolve });
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

    const request = enqueue(id)
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
