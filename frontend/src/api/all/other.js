import { put, get } from '../fetch';

const getSiteStats = () => get('/stats');

const redeemPromocode = (fields) => put('/promocode/use', {
    ...fields,
});

export {
    redeemPromocode,
    getSiteStats,
};
