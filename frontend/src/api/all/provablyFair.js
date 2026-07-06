import { get, post, put } from '../fetch';

export const getProvablyFairState = () => get('/profile/provably-fair');
export const setClientSeed = (clientSeed) => put('/profile/provably-fair/client-seed', { clientSeed }, true);
export const rotateSeed = () => post('/profile/provably-fair/rotate', {}, true);
export const getOpenHistory = (limit = 50, offset = 0) => get(`/profile/provably-fair/history?limit=${limit}&offset=${offset}`);
export const verifyOpen = (payload) => post('/provably-fair/verify', payload, true);
