import { ADD_ITEMS_CACHE } from '../types';

const initialState = {};

const itemCacheReducer = (prevState = initialState, action) => {
    switch (action.type) {
        case ADD_ITEMS_CACHE:
            return {
                ...prevState,
                [action.payloadKey]: action.payloadData,
            };
        default:
            return prevState;
    }
};

export default itemCacheReducer;

