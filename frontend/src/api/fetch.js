import { API_URL } from './config';
import { getToken, removeToken } from './token';

const getHeaders = () => {
    const token = getToken();
    const headers = {
        Accept: 'application/json',
        'Content-type': 'application/json',
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
};

const endSessionIfRevoked = (result, headers) => {
    if (result.status !== 401 || !headers.Authorization) {
        return;
    }
    const sentToken = headers.Authorization.slice('Bearer '.length);
    const sessionEnded = getToken() === sentToken;
    removeToken(sentToken);
    if (sessionEnded) {
        window.location.reload();
    }
};

const errorPayload = async (result) => {
    try {
        const body = await result.json();
        const message = body && typeof body.message === 'string' ? body.message : '';
        return message ? { error: result.status, message } : { error: result.status };
    } catch (e) {
        return { error: result.status };
    }
};

export const post = async (destination, body) => {
    const headers = getHeaders();

    const result = await fetch(`${API_URL}${destination}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (result.ok) {
        return result.json();
    }
    endSessionIfRevoked(result, headers);

    const failure = await errorPayload(result);
    throw failure;
};
export const put = async (destination, body) => {
    const headers = getHeaders();

    const result = await fetch(`${API_URL}${destination}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
    });

    if (result.ok) {
        return result.json();
    }
    endSessionIfRevoked(result, headers);

    const failure = await errorPayload(result);
    throw failure;
};
export const get = async (destination) => {
    const headers = getHeaders();
    const result = await fetch(`${API_URL}${destination}`, {
        method: 'GET',
        headers,
    });
    if (result.ok) {
        return result.json();
    }
    endSessionIfRevoked(result, headers);
    // eslint-disable-next-line no-throw-literal
    throw { error: result.status };
};
