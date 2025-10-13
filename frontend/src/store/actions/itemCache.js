import {ADD_ITEMS_CACHE} from '../types';
import {getItemInfoById} from '../../api/all/item';

export const itemInfoFetch = (id) => async (dispatch, getState) => {
    const {itemCache} = getState();

    if (itemCache[id]) {
        return itemCache[id];
    }

    const itemInfo = await getItemInfoById(id).then((result) => result.data);

    dispatch({ type: ADD_ITEMS_CACHE, payloadKey: id, payloadData: itemInfo})
    return itemInfo;
}