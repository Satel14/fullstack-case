import {
    UPDATE_MMR,
    UPDATE_USER_SETTINGS,
    ADD_USER,
    LOGIN_USER,
    LOGOUT_USER,
    AUTH_MESSAGE_ERROR
} from '../types'

const initialState = {
    user: {},
    profile: {},
    message: "",
};

export const usersReducer = (prevState = initialState, action) => {
    switch (action.type) {
        case LOGIN_USER:
          return {
            ...prevState,
            user: action.payload_user,
            profile: action.payload_profile,
          };
        case LOGOUT_USER:
          return { ...prevState, user: {}, profile: {}, message: "" };
        case UPDATE_USER_SETTINGS:
          return {
            ...prevState,
            user: action.payload,
          };
        case UPDATE_MMR:
            return {
                ...prevState,
                user: action.payload,
            };
        case AUTH_MESSAGE_ERROR:
            return {
                ...prevState,
                message: action.payload,
            };
        case ADD_USER:
            return {
                ...prevState,
                user: action.payload,
            };
        default:
            return prevState;
    }
}