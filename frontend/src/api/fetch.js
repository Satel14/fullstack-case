import { API_URL } from './config'
import { getToken } from './token'

const getHeaders = async () => {
    const token = await getToken()
    const headers = {
        Accept: "application/json",
        "Content-type": "application/json",
    }
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

export const post = async (destination, body) => {
    const headers = await getHeaders();

    const result = await fetch(`${API_URL}${destination}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    })
    if (result.ok) {
        return await result.json();
    }

    throw (error: result.status)
}

export const get = async (destination) => {
    const headers = await getHeaders();
    const result = await fetch(`${API_URL}${destination}`, {
        method: "GET",
        headers,
    })
    if (result.ok) {
        return await result.json()
    }
    throw (error: result.status)
}