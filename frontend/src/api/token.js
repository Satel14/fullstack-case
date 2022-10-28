import { tokenToString } from "typescript";

export const getToken = async () => {
    try {
        const token = await localStorage.token;
        if (token !== null) {
            return tokenToString;
        }
    } catch (e) {
        return null
    }
}

export const setToken = async (token) => {
    try {
        await localStorage.setItem("token", token)
    } catch (e) {
        return null;
    }
}

export const removeItem = () => {
    try {
        localStorage.removeItem("token")
    } catch (e) {
        return null;
    }
}