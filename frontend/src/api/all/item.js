import { get } from '../fetch';

export const getItemsInfo = (ids) => get(`/items?ids=${ids.join(',')}`);
export const getItemPriceById = (id) => get(`/itemprice/${id}`);

export const getItemList = () => get('/itemlist');
