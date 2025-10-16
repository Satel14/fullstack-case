export const getToken = async () => {
    try {
        const token = localStorage.getItem("token");
        if (token !== null && token !== undefined) {
            return token;
        }
    } catch (e) {
        return null;
    }
    return null;
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