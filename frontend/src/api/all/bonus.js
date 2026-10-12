import { get, post } from '../fetch';

const getBonusList = () => get('/bonus/user');

const activateBonus = (bonusId) => post('/bonus/activate', { bonusId });

export { getBonusList, activateBonus };
