const TOKEN_KEY = 'token';

const persistent = () => window.localStorage;
const perSession = () => window.sessionStorage;

const readFrom = (storage) => {
    try {
        return storage().getItem(TOKEN_KEY);
    } catch (e) {
        return null;
    }
};

const removeFrom = (storage) => {
    try {
        storage().removeItem(TOKEN_KEY);
    } catch (e) {
        return false;
    }
    return true;
};

export const getToken = () => readFrom(perSession) || readFrom(persistent) || null;

export const setToken = (token, remember = true) => {
    const [keep, drop] = remember ? [persistent, perSession] : [perSession, persistent];
    removeFrom(drop);
    try {
        keep().setItem(TOKEN_KEY, token);
    } catch (e) {
        return false;
    }
    return true;
};

export const removeToken = () => {
    removeFrom(persistent);
    removeFrom(perSession);
};
