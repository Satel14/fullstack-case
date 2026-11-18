import { get, post, put } from '../fetch';

export const getAdminCases = () => get('/admin/cases');

export const updateAdminCase = (id, payload) => put(`/admin/case/${id}`, payload);

export const getAdminArticles = () => get('/admin/articles');

export const updateAdminArticle = (id, payload) => put(`/admin/article/${id}`, payload);

export const getAdminPromocodes = () => get('/admin/promocodes');

export const createAdminPromocode = (payload) => post('/admin/promocode', payload);

export const updateAdminPromocode = (code, payload) => put(`/admin/promocode/${encodeURIComponent(code)}`, payload);

export const getAdminUsers = ({ search = '', limit = 50, offset = 0 } = {}) => {
    const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search) {
        query.set('search', search);
    }
    return get(`/admin/users?${query.toString()}`);
};

export const setUserRole = (id, role) => put(`/admin/user/${id}/role`, { role });

export const getAdminUser = (id) => get(`/admin/user/${id}`);

export const adjustUserBalance = (id, delta, reason) => post(`/admin/user/${id}/balance`, { delta, reason });

export const getAdminActions = ({ limit = 50, offset = 0 } = {}) => get(`/admin/actions?limit=${limit}&offset=${offset}`);

export const getSaleRate = () => get('/admin/sale-rate');

export const updateSaleRate = (rate, reason) => put('/admin/sale-rate', { rate, reason });
