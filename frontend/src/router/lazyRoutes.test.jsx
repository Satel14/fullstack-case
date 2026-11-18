import React from 'react';
import {
    act, fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import { Link } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import usersReducer from '../store/reducers/user';
import moduleReducer from '../store/reducers/module';
import { LOGIN_USER } from '../store/types';
import roles from '../enum/role';

jest.mock('react-i18next', () => {
    const mockReact = require('react');
    const t = (key) => key;
    return {
        useTranslation: () => ({ t }),
        withTranslation: () => (Component) => (props) => mockReact.createElement(Component, { ...props, t }),
    };
});

const mockPageLoads = [];
const mockFailures = {};
const mockMounts = jest.fn();
const mockUnmounts = jest.fn();
const mockPage = (name) => {
    mockPageLoads.push(name);
    if (mockFailures[name]) {
        throw mockFailures[name];
    }
    const Page = ({ match, location }) => {
        const user = useSelector((state) => state.user);
        React.useEffect(() => {
            mockMounts(name);
            return () => mockUnmounts(name);
        }, []);
        return (
            <div>
                <h1>{`${name} page`}</h1>
                <input aria-label="page draft" />
                <output aria-label="page balance">{user.balance}</output>
                <output aria-label="page id">{match.params.id}</output>
                <output aria-label="return location">{JSON.stringify(location.state && location.state.from)}</output>
            </div>
        );
    };
    return { __esModule: true, default: Page };
};

const MockLayout = ({ children }) => {
    const [clicks, setClicks] = React.useState(0);
    return (
        <div>
            <header><button type="button" onClick={() => setClicks(clicks + 1)}>{`header ${clicks}`}</button></header>
            <nav><Link to="/">catalog</Link><Link to="/settings">settings</Link></nav>
            <main>{children}</main>
            <aside>chat</aside>
        </div>
    );
};

jest.mock('../Layout.jsx', () => ({ __esModule: true, default: MockLayout }));
jest.mock('../pages/Cases', () => mockPage('Cases'));
jest.mock('../pages/Case', () => mockPage('Case'));
jest.mock('../pages/Article', () => mockPage('Article'));
jest.mock('../pages/Auth/Login.jsx', () => mockPage('Login'));
jest.mock('../pages/Auth/Registration.jsx', () => mockPage('Registration'));
jest.mock('../pages/Auth/ResetPassword', () => mockPage('ResetPassword'));
jest.mock('../pages/Auth/ConfirmEmail', () => mockPage('ConfirmEmail'));
jest.mock('../pages/Promocode', () => mockPage('Promocode'));
jest.mock('../pages/Profile', () => mockPage('Profile'));
jest.mock('../pages/Deposit', () => mockPage('Deposit'));
jest.mock('../pages/PaymentGateway', () => mockPage('PaymentGateway'));
jest.mock('../pages/Settings.jsx', () => mockPage('Settings'));
jest.mock('../pages/Top', () => mockPage('Top'));
jest.mock('../pages/Faq', () => mockPage('Faq'));
jest.mock('../pages/ProvablyFair', () => mockPage('ProvablyFair'));
jest.mock('../pages/Inventory', () => mockPage('Inventory'));
jest.mock('../pages/Admin', () => mockPage('Admin'));
jest.mock('../pages/Bonus', () => mockPage('Bonus'));
jest.mock('../store/actions/user', () => ({ getProfileFetch: jest.fn() }));
jest.mock('../store/actions/module', () => ({ getAllModules: jest.fn() }));

const RouterLayout = require('./RouterLayout').default;
const { getProfileFetch } = require('../store/actions/user');
const { getAllModules } = require('../store/actions/module');

const PLAYER = {
    user_id: 7, user_login: 'player', user_email: 'p@e.ua', user_balance: '10.00', user_avatar: 1, user_receiveInfo: '', user_role: roles.NORMAL,
};

const signsInAs = (payloadUser) => () => (dispatch) => {
    dispatch({ type: LOGIN_USER, payloadUser });
    return Promise.resolve();
};

const renderAt = (path, state = {}) => {
    window.history.pushState(state, '', path);
    const store = createStore(combineReducers({ user: usersReducer, modules: moduleReducer }), applyMiddleware(thunk));
    const view = render(<Provider store={store}><RouterLayout /></Provider>);
    return { ...view, store };
};

beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getAllModules.mockImplementation(() => () => Promise.resolve());
    getProfileFetch.mockImplementation(signsInAs(PLAYER));
    mockMounts.mockClear();
    mockUnmounts.mockClear();
});

afterEach(() => {
    console.error.mockRestore();
});

test('loading the route map evaluates only the two landing pages, leaving secondary pages unloaded', () => {
    expect(mockPageLoads).toEqual(['Cases', 'Case']);
});

test.each([['/', 'Cases'], ['/case/alpha', 'Case']])('the landing page %s renders before the session check finishes', async (path, name) => {
    getProfileFetch.mockImplementation(() => () => new Promise(() => {}));
    renderAt(path);

    expect(screen.getByRole('heading', { name: `${name} page` })).toBeInTheDocument();
    expect(screen.getByRole('main').querySelector('.loader')).toBeNull();
    await waitFor(() => expect(getProfileFetch).toHaveBeenCalled());
});

test('a public chunk shows the content loader with a working layout, then renders with router props', async () => {
    renderAt('/profile/7');
    const header = screen.getByRole('banner');
    const menu = screen.getByRole('navigation');
    const chat = screen.getByRole('complementary');

    expect(screen.getByRole('main').querySelector('.loader')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Profile page' })).toBeNull();
    expect(document.title).toBe('profile.title — CASES.UA');
    fireEvent.click(screen.getByRole('button', { name: 'header 0' }));
    expect(screen.getByRole('button', { name: 'header 1' })).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Profile page' })).toBeInTheDocument();
    expect(screen.getByLabelText('page id')).toHaveTextContent('7');
    expect(screen.getByRole('main').querySelector('.loader')).toBeNull();
    expect(screen.getByRole('banner')).toBe(header);
    expect(screen.getByRole('navigation')).toBe(menu);
    expect(screen.getByRole('complementary')).toBe(chat);
    expect(mockPageLoads.filter((name) => name === 'Profile')).toHaveLength(1);
});

test('a rejected chunk shows LoadError inside the layout and retry imports it again and recovers', async () => {
    mockFailures.ProvablyFair = new Error('Loading chunk provably-fair failed');
    renderAt('/provably-fair');
    const header = screen.getByRole('banner');

    expect(await screen.findByRole('alert')).toHaveTextContent('common.loadFailed');
    expect(within(screen.getByRole('main')).getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('crash.title')).toBeNull();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toHaveTextContent('chat');
    expect(mockPageLoads.filter((name) => name === 'ProvablyFair')).toHaveLength(1);

    delete mockFailures.ProvablyFair;
    fireEvent.click(screen.getByRole('button', { name: /common.retry/ }));

    expect(screen.getByRole('main').querySelector('.loader')).not.toBeNull();
    expect(await screen.findByRole('heading', { name: 'ProvablyFair page' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('banner')).toBe(header);
    expect(mockPageLoads.filter((name) => name === 'ProvablyFair')).toHaveLength(2);
});

test('leaving a failed chunk resets the route boundary, and returning still allows a real retry', async () => {
    mockFailures.Settings = new TypeError('Failed to fetch dynamically imported module');
    renderAt('/settings');
    expect(await screen.findByRole('alert')).toHaveTextContent('common.loadFailed');

    fireEvent.click(screen.getByRole('link', { name: 'catalog' }));
    expect(screen.getByRole('heading', { name: 'Cases page' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('common.loadFailed');

    delete mockFailures.Settings;
    fireEvent.click(screen.getByRole('button', { name: /common.retry/ }));
    expect(await screen.findByRole('heading', { name: 'Settings page' })).toBeInTheDocument();
});

test('Redux updates preserve a lazy private page, its draft and the resolved import', async () => {
    const { store } = renderAt('/inventory');
    expect(await screen.findByRole('heading', { name: 'Inventory page' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('page draft'), { target: { value: 'keep this draft' } });

    act(() => store.dispatch({ type: LOGIN_USER, payloadUser: { ...PLAYER, user_balance: '90.00' } }));
    act(() => store.dispatch({ type: LOGIN_USER, payloadUser: { ...PLAYER, user_balance: '90.00', user_avatar: 5 } }));

    expect(screen.getByLabelText('page balance')).toHaveTextContent('90.00');
    expect(screen.getByLabelText('page draft')).toHaveValue('keep this draft');
    expect(mockMounts.mock.calls.filter(([name]) => name === 'Inventory')).toHaveLength(1);
    expect(mockUnmounts).not.toHaveBeenCalledWith('Inventory');
    expect(mockPageLoads.filter((name) => name === 'Inventory')).toHaveLength(1);
});

test('a guest is redirected before a private chunk loads, preserving the entire return location', async () => {
    getProfileFetch.mockImplementation(() => () => null);
    renderAt('/deposit?amount=50#details', { state: { source: 'bonus' } });
    expect(await screen.findByRole('heading', { name: 'Login page' })).toBeInTheDocument();

    expect(mockPageLoads).not.toContain('Deposit');
    expect(JSON.parse(screen.getByLabelText('return location').textContent)).toMatchObject({
        pathname: '/deposit', search: '?amount=50', hash: '#details', state: { source: 'bonus' },
    });
});

test('the session and administrator gates run before the admin chunk is loaded', async () => {
    let finishCheck;
    getProfileFetch.mockImplementation(() => () => new Promise((resolve) => { finishCheck = resolve; }));
    renderAt('/admin');
    await waitFor(() => expect(finishCheck).toBeDefined());

    expect(screen.getByRole('main').querySelector('.loader')).not.toBeNull();
    expect(mockPageLoads).not.toContain('Admin');
    await act(async () => finishCheck());
    expect(screen.getByText('error.notFound')).toBeInTheDocument();
    expect(mockPageLoads).not.toContain('Admin');
    expect(document.title).toBe('error.notFound — CASES.UA');
});

test.each([
    ['/admin', 'Admin'],
    ['/article/3', 'Article'],
    ['/registration', 'Registration'],
    ['/reset-password', 'ResetPassword'],
    ['/confirm-email', 'ConfirmEmail'],
    ['/promocode', 'Promocode'],
    ['/deposit', 'Deposit'],
    ['/payment', 'PaymentGateway'],
    ['/top', 'Top'],
    ['/faq', 'Faq'],
    ['/bonus', 'Bonus'],
])('the secondary route %s loads and renders its own page', async (path, name) => {
    getProfileFetch.mockImplementation(signsInAs({ ...PLAYER, user_role: roles.ADMINISTRATOR }));
    renderAt(path);

    expect(screen.getByRole('main').querySelector('.loader')).not.toBeNull();
    expect(await screen.findByRole('heading', { name: `${name} page` })).toBeInTheDocument();
    expect(screen.getByRole('main').querySelector('.loader')).toBeNull();
    expect(mockPageLoads.filter((loaded) => loaded === name)).toHaveLength(1);
});
