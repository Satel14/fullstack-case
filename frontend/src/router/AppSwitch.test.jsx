import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Link } from 'react-router-dom';
import AppSwitch from './AppSwitch';
import roles from '../enum/role';

jest.mock('react-i18next', () => {
    const mockReact = require('react');
    const t = (key) => key;
    return {
        useTranslation: () => ({ t }),
        withTranslation: () => (Component) => (props) => mockReact.createElement(Component, { ...props, t }),
    };
});

const page = (name) => () => <div>{name}</div>;

const SignIn = ({ location }) => (
    <div>{`sign-in for ${location.state && location.state.from ? location.state.from.pathname : 'nothing'}`}</div>
);

const routes = {
    public: [{ path: '/', exact: true, component: page('home') }, { path: '/login', exact: true, component: SignIn }],
    private: [{ path: '/inventory', exact: true, component: page('inventory') }],
    admin: [{ path: '/admin', exact: true, component: page('admin') }],
};

const guest = {};
const player = { login: 'player', role: roles.NORMAL };
const admin = { login: 'admin', role: roles.ADMINISTRATOR };

const renderAt = (path, user, { sessionChecked = true } = {}) => render(
    <MemoryRouter initialEntries={[path]}>
        <AppSwitch routes={routes} user={user} sessionChecked={sessionChecked} fallback={page('not-found')} />
    </MemoryRouter>,
);

test('an administrator reaches the admin page', () => {
    renderAt('/admin', admin);
    expect(screen.getByText('admin')).toBeInTheDocument();
});

test('an authorized player reaches a private page', () => {
    renderAt('/inventory', player);
    expect(screen.getByText('inventory')).toBeInTheDocument();
});

test('a player who is not an administrator gets not-found on the admin page', () => {
    renderAt('/admin', player);
    expect(screen.getByText('not-found')).toBeInTheDocument();
});

test('a guest on a private page is sent to sign in, and the sign-in page learns which page they wanted', () => {
    renderAt('/inventory', guest);
    expect(screen.getByText('sign-in for /inventory')).toBeInTheDocument();
});

test('a guest gets not-found on the admin page', () => {
    renderAt('/admin', guest);
    expect(screen.getByText('not-found')).toBeInTheDocument();
});

test('while the session is being checked, private and admin pages show a loader instead of a verdict', () => {
    const { container, unmount } = renderAt('/inventory', guest, { sessionChecked: false });
    expect(container.querySelector('.loader')).not.toBeNull();
    expect(screen.queryByText('not-found')).toBeNull();
    expect(screen.queryByText(/^sign-in for/)).toBeNull();
    unmount();

    const adminPage = renderAt('/admin', guest, { sessionChecked: false });
    expect(adminPage.container.querySelector('.loader')).not.toBeNull();
    expect(screen.queryByText('not-found')).toBeNull();
});

test('public pages and unknown pages do not wait for the session check', () => {
    const { unmount } = renderAt('/', guest, { sessionChecked: false });
    expect(screen.getByText('home')).toBeInTheDocument();
    unmount();

    renderAt('/nope', guest, { sessionChecked: false });
    expect(screen.getByText('not-found')).toBeInTheDocument();
});

test('an authorized user gets not-found on an unknown page', () => {
    renderAt('/nope', admin);
    expect(screen.getByText('not-found')).toBeInTheDocument();
});

test('a user update re-renders the current page without remounting it', () => {
    let mounts = 0;
    const Probe = () => {
        React.useEffect(() => { mounts += 1; }, []);
        return <div>probe</div>;
    };
    const probeRoutes = {
        public: [],
        private: [{ path: '/settings', exact: true, component: Probe }],
        admin: [],
    };
    const at = (user) => (
        <MemoryRouter initialEntries={['/settings']}>
            <AppSwitch routes={probeRoutes} user={user} sessionChecked fallback={page('not-found')} />
        </MemoryRouter>
    );

    const { rerender } = render(at(player));
    rerender(at({ ...player, avatar: 5 }));
    rerender(at({ ...player, balance: '90.00' }));

    expect(screen.getByText('probe')).toBeInTheDocument();
    expect(mounts).toBe(1);
});

test('a page that crashes is contained, and the next page the player opens renders normally', () => {
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
        throw new Error('render failed');
    };
    render(
        <MemoryRouter initialEntries={['/broken']}>
            <Link to="/">go home</Link>
            <AppSwitch
                routes={{ public: [{ path: '/broken', exact: true, component: Broken }, ...routes.public], private: [], admin: [] }}
                user={guest}
                sessionChecked
                fallback={page('not-found')}
            />
        </MemoryRouter>,
    );

    expect(screen.getByText('crash.title')).toBeInTheDocument();
    expect(screen.getByText('go home')).toBeInTheDocument();

    fireEvent.click(screen.getByText('go home'));

    expect(screen.getByText('home')).toBeInTheDocument();
    expect(screen.queryByText('crash.title')).toBeNull();
    errors.mockRestore();
});

test('a page receives the router props', () => {
    const Params = ({ match }) => <div>{`id=${match.params.id}`}</div>;
    render(
        <MemoryRouter initialEntries={['/profile/3']}>
            <AppSwitch
                routes={{ public: [{ path: '/profile/:id', component: Params }], private: [], admin: [] }}
                user={guest}
                fallback={page('not-found')}
            />
        </MemoryRouter>,
    );

    expect(screen.getByText('id=3')).toBeInTheDocument();
});
