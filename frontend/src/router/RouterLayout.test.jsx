import React from 'react';
import {
    render, screen, waitFor, act,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import RouterLayout from './RouterLayout';
import usersReducer from '../store/reducers/user';
import moduleReducer from '../store/reducers/module';
import { LOGIN_USER } from '../store/types';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../Layout.jsx', () => ({
    __esModule: true,
    default: ({ children }) => <div>{children}</div>,
}));

jest.mock('./routes', () => ({
    __esModule: true,
    default: {
        public: [
            { path: '/', exact: true, component: () => <div>home page</div> },
            { path: '/login', exact: true, component: () => <div>login page</div> },
        ],
        private: [{ path: '/inventory', exact: true, component: () => <div>inventory page</div> }],
        admin: [],
    },
}));

jest.mock('../store/actions/user', () => ({ getProfileFetch: jest.fn() }));
jest.mock('../store/actions/module', () => ({ getAllModules: jest.fn() }));

const { getProfileFetch } = require('../store/actions/user');
const { getAllModules } = require('../store/actions/module');

const PLAYER = {
    user_id: 7, user_login: 'player', user_email: 'p@e.ua', user_balance: '10.00', user_avatar: 1, user_receiveInfo: '', user_role: 1,
};

const signsInAs = (payloadUser) => () => (dispatch) => {
    dispatch({ type: LOGIN_USER, payloadUser });
    return Promise.resolve();
};

const renderAt = (path) => {
    window.history.pushState({}, '', path);
    const store = createStore(combineReducers({ user: usersReducer, modules: moduleReducer }), applyMiddleware(thunk));
    return render(
        <Provider store={store}>
            <RouterLayout />
        </Provider>,
    );
};

beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getAllModules.mockImplementation(() => () => Promise.resolve());
    getProfileFetch.mockImplementation(signsInAs(PLAYER));
});

afterEach(() => {
    console.error.mockRestore();
});

test('a private page shows a loader while the session is checked, then the page itself', async () => {
    let finishCheck;
    getProfileFetch.mockImplementation(() => (dispatch) => new Promise((resolve) => {
        finishCheck = () => {
            dispatch({ type: LOGIN_USER, payloadUser: PLAYER });
            resolve();
        };
    }));

    const { container } = renderAt('/inventory');

    await waitFor(() => expect(finishCheck).toBeDefined());
    expect(container.querySelector('.loader')).not.toBeNull();
    expect(screen.queryByText('error.notFound')).toBeNull();

    act(() => finishCheck());

    expect(await screen.findByText('inventory page')).toBeInTheDocument();
});

test('a guest who opens a private page is sent to the sign-in page', async () => {
    getProfileFetch.mockImplementation(() => () => null);

    renderAt('/inventory');

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
});

test('a signed-in player reaches a private page even when the modules request fails', async () => {
    getAllModules.mockImplementation(() => () => Promise.reject(new SyntaxError('Unexpected token < in JSON')));

    renderAt('/inventory');

    expect(await screen.findByText('inventory page')).toBeInTheDocument();
    expect(getProfileFetch).toHaveBeenCalledTimes(1);
});
