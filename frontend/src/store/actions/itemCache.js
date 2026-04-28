import { ADD_ITEMS_CACHE } from '../types';
import { getItemInfoById } from '../../api/all/item';

// eslint-disable-next-line import/prefer-default-export
export const itemInfoFetch = (id) => async (dispatch, getState) => {
    const { itemCache } = getState();

    if (itemCache[id]) {
        return itemCache[id];
    }

    try {
        const itemInfo = await getItemInfoById(id).then((result) => result.data);

        dispatch({ type: ADD_ITEMS_CACHE, payloadKey: id, payloadData: itemInfo });
        return itemInfo;
    } catch (error) {
        const placeholderItem = {
            item_itemId: id,
            item_name: `Item ${id}`,
            item_rare: 'Factory New',
            item_type: 'Unknown',
        };

        dispatch({ type: ADD_ITEMS_CACHE, payloadKey: id, payloadData: placeholderItem });
        return placeholderItem;
    }
};