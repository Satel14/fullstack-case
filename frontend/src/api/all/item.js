import { get } from '../fetch';

export const getItemInfoById = (id) => get(`/item/${id}`);
export const getItemPriceById = (id) => get(`/itemprice/${id}`);

export const getItemList = () => get('/itemlist');
