import { LOAD_MODULES, SET_MODULE_VALUE } from '../types';

const initialState = {};

const moduleReducer = (prevState = initialState, action) => {
    switch (action.type) {
        case LOAD_MODULES:
            return {
                ...prevState,
                [action.payloadKey]: action.payloadData,
            };
        case SET_MODULE_VALUE:
            return {
                ...prevState,
                [action.payloadKey]: {
                    ...prevState[action.payloadKey],
                    param: action.payloadKey,
                    extraData: action.payloadData,
                },
            };
        default:
            return prevState;
    }
};

export default moduleReducer;
