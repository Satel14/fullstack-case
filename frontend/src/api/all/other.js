import { put, get } from '../fetch';

const getSiteStats = () => get('/stats');

const usePromocode = (fields) => put('/promocode/use', {
    ...fields,
});

export {
    usePromocode,
    getSiteStats,
};
