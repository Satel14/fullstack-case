import { get } from '../fetch';

// eslint-disable-next-line import/prefer-default-export
export const getArticleById = (id) => get(`/article/${id}`);
