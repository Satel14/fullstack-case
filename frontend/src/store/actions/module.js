import { LOAD_MODULES, SET_MODULE_VALUE } from '../types';
import { API_URL } from '../../api/config';
import { SALE_RATE_MODULE, isSaleRate, saleRateOf } from '../../helpers/saleRate';

const loadModules = (key, data) => ({
    type: LOAD_MODULES,
    payloadKey: key,
    payloadData: data,
});

const setModuleValue = (key, value) => ({
    type: SET_MODULE_VALUE,
    payloadKey: key,
    payloadData: value,
});

export const syncSaleRate = (rate) => (dispatch, getState) => {
    if (isSaleRate(rate) && rate !== saleRateOf(getState().modules)) {
        dispatch(setModuleValue(SALE_RATE_MODULE, rate));
    }
};

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
