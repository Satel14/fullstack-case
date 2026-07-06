import { LOAD_MODULES } from '../types';

const initialState = {};

const moduleReducer = (prevState = initialState, action) => {
    switch (action.type) {
        case LOAD_MODULES:
            return {
                ...prevState,
                [action.payloadKey]: action.payloadData,
            };
        default:
            return prevState;
    }
};

export default moduleReducer;
