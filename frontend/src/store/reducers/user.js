/* eslint-disable camelcase */
import {
    LOGIN_USER,
    LOGOUT_USER,
    UPDATE_USER_FIELD,
} from '../types';
import userFields from '../config/userFields';

const initialState = {
    id: null,
    login: '',
    email: '',
    balance: 0.00,
    avatar: 1,
    receiveInfo: '',
    role: 1,
};

const usersReducer = (prevState = initialState, action) => {
    switch (action.type) {
    case LOGIN_USER:
        return {
            ...prevState,
            [userFields.user_id]: action.payloadUser.user_id,
            [userFields.user_login]: action.payloadUser.user_login,
            [userFields.user_email]: action.payloadUser.user_email,
            [userFields.user_balance]: action.payloadUser.user_balance,
            [userFields.user_avatar]: action.payloadUser.user_avatar,
            [userFields.user_receiveInfo]: action.payloadUser.user_receiveInfo,
            [userFields.user_role]: action.payloadUser.user_role,
        };
    case LOGOUT_USER:
        return {
            ...prevState, login: null,
        };
    case UPDATE_USER_FIELD:
        return {
            ...prevState,
            [action.payloadKey]: action.payloadData,
        };
    default:
        return prevState;
    }
};

export default usersReducer;

