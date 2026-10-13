import { ADD_ITEM_LIST_CACHE } from '../types';
import { getItemsInfo } from '../../api/all/item';

const ITEMS_PER_REQUEST = 200;
const ITEM_ID = /^[1-9]\d{0,9}$/;

const pending = new Map();
let queue = [];

const placeholderItem = (id, failed) => ({
    item_itemId: id,
    item_name: `Item ${id}`,
    item_rare: 'Factory New',
    item_type: 'Unknown',
    placeholder: failed ? 'failed' : 'unknown',
});

const isSettled = (itemInfo) => Boolean(itemInfo) && itemInfo.placeholder !== 'failed';

const replaces = (answer, current) => !current || !answer.placeholder || (isSettled(answer) && !isSettled(current));

const fetchKnownItems = async (ids) => {
    if (!ids.length) {
        return {};
    }
    try {
        const result = await getItemsInfo(ids);
        return (result && result.data) || {};
    } catch (e) {
        return null;
    }
};

const requestBatch = async (entries) => {
    const ids = [...new Set(entries.map((entry) => String(entry.id)))].filter((id) => ITEM_ID.test(id));
    const found = await fetchKnownItems(ids);
    const updates = new Map();
    const results = entries.map(({ id, dispatch, getState }) => {
        const answer = (found && found[id]) || placeholderItem(id, !found);
        const current = getState().itemCache[id];
        if (!replaces(answer, current)) {
            return current;
        }
        if (!updates.has(dispatch)) {
            updates.set(dispatch, {});
        }
        updates.get(dispatch)[id] = answer;
        return answer;
    });
    try {
        updates.forEach((items, dispatch) => dispatch({ type: ADD_ITEM_LIST_CACHE, payloadItems: items }));
    } finally {
        entries.forEach(({ resolve }, index) => resolve(results[index]));
    }
};

const flush = () => {
    const entries = queue;
    queue = [];
    for (let start = 0; start < entries.length; start += ITEMS_PER_REQUEST) {
        requestBatch(entries.slice(start, start + ITEMS_PER_REQUEST));
    }
};

const enqueue = (entry) => new Promise((resolve) => {
    if (!queue.length) {
        Promise.resolve().then(flush);
    }
    queue.push({ ...entry, resolve });
});

export const addItemsToCache = (itemList) => (dispatch) => {
    const items = Object.fromEntries(Object.entries(itemList || {}).filter(([, itemInfo]) => itemInfo));
    if (Object.keys(items).length) {
        dispatch({ type: ADD_ITEM_LIST_CACHE, payloadItems: items });
    }
};

export const itemInfoFetch = (id) => (dispatch, getState) => {
    const cached = getState().itemCache[id];
    const key = String(id);

    if (isSettled(cached)) {
        return Promise.resolve(cached);
    }
    if (pending.has(key)) {
        return pending.get(key);
    }

    const request = enqueue({ id, dispatch, getState })
        .finally(() => {
            pending.delete(key);
        });

    pending.set(key, request);
    return request;
};
