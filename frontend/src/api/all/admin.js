import { get, post, put } from '../fetch';

export const getAdminCases = () => get('/admin/cases');

export const updateAdminCase = (id, payload) => put(`/admin/case/${id}`, payload);

export const getAdminUsers = ({ search = '', limit = 50, offset = 0 } = {}) => {
    const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search) {
        query.set('search', search);
    }
    return get(`/admin/users?${query.toString()}`);
};

export const setUserRole = (id, role) => put(`/admin/user/${id}/role`, { role });

export const adjustUserBalance = (id, delta, reason) => post(`/admin/user/${id}/balance`, { delta, reason });

export const getAdminActions = ({ limit = 50, offset = 0 } = {}) =>
    get(`/admin/actions?limit=${limit}&offset=${offset}`);
