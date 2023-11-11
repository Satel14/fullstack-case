import { get, post} from '../fetch';

export const getAllCases = () => get('/cases')
export const getCaseById = (id) => get(`/case/${id}`);
export const openCaseById = (id, count) => post('/case/open', {
    id,count
}, true)
