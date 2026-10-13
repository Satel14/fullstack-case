import { LOAD_MODULES } from '../types';
import { API_URL } from '../../api/config';

const loadModules = (key, data) => ({
    type: LOAD_MODULES,
    payloadKey: key,
    payloadData: data,
});

// eslint-disable-next-line import/prefer-default-export
export const getAllModules = () => (dispatch) => fetch(`${API_URL}/module/all`, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
})
    .then((resp) => resp.json())
    .then((data) => {
        const modulesAll = data.data;
        Object.keys(modulesAll || {}).forEach((key) => {
            dispatch(loadModules(modulesAll[key].param, modulesAll[key]));
        });
        return undefined;
    });
