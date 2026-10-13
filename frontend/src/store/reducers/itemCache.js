import { ADD_ITEM_LIST_CACHE } from '../types';

const initialState = {};

const itemCacheReducer = (prevState = initialState, action) => {
    switch (action.type) {
        case ADD_ITEM_LIST_CACHE:
            return {
                ...prevState,
                ...action.payloadItems,
            };
        default:
            return prevState;
    }
};

export default itemCacheReducer;
