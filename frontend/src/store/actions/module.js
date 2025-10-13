/* eslint-disable promise/always-return */
/* eslint-disable guard-for-in */
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
    // eslint-disable-next-line promise/always-return
    .then((data) => {
        // console.log(data);
        const modulesAll = data.data;
        // eslint-disable-next-line no-restricted-syntax
        for (const key in modulesAll) {
            dispatch(loadModules(modulesAll[key].param, modulesAll[key]));
        }
    });
