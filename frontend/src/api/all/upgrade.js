import { get, post } from '../fetch';

export const getUpgradeTargets = ({
    minPrice, maxPrice, search, limit = 60, offset = 0,
} = {}) => {
    const query = new URLSearchParams();
    Object.entries({
        minPrice, maxPrice, search, limit, offset,
    }).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            query.set(key, value);
        }
    });
    return get(`/upgrade/targets?${query.toString()}`);
};

export const postUpgrade = ({
    storageIds, targetItemId, targetColor, expectedThreshold,
}) => post('/upgrade', {
    storageIds, targetItemId, targetColor, expectedThreshold,
});

export const getUpgradeHistory = (limit = 50, offset = 0) => get(`/profile/provably-fair/upgrades?limit=${limit}&offset=${offset}`);

export const verifyUpgrade = (body) => post('/provably-fair/verify-upgrade', body);
