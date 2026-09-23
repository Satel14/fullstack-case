import { API_URL } from './config'
import { getToken } from './token'
import openNotification from '../components/mini/openNotification';
import i18n from '../i18n';

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

const endSessionIfRevoked = (result, headers) => {
    if (result.status !== 401 || !headers.Authorization) {
        return;
    }
    const sentToken = headers.Authorization.slice('Bearer '.length);
    if (localStorage.getItem('token') !== sentToken) {
        return;
    }
    localStorage.removeItem('token');
    window.location.reload();
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

export const post = async (destination, body, notificationErr = false) => {
    const headers = await getHeaders();

    const result = await fetch(`${API_URL}${destination}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (result.ok) {
        return result.json();
    }
    endSessionIfRevoked(result, headers);
    if (notificationErr) {
        openNotification('error', i18n.t('common.error'), i18n.t('common.serverError'))
    }

    const failure = await errorPayload(result);
    throw failure;
};
export const put = async (destination, body, notificationErr = false) => {
    const headers = await getHeaders();

    const result = await fetch(`${API_URL}${destination}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
    });

    if (result.ok) {
        return result.json();
    }
    endSessionIfRevoked(result, headers);

    if (notificationErr) {
        openNotification('error', i18n.t('common.error'), i18n.t('common.serverError'));
    }

    const failure = await errorPayload(result);
    throw failure;
};
export const get = async (destination) => {
    const headers = await getHeaders();
    const result = await fetch(`${API_URL}${destination}`, {
        method: "GET",
        headers,
    });
    if (result.ok) {
        return result.json()
    }
    endSessionIfRevoked(result, headers);
    // eslint-disable-next-line no-throw-literal
    throw { error: result.status };
};
