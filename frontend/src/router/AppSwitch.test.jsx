import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppSwitch from './AppSwitch';
import roles from '../enum/role';

const page = (name) => () => <div>{name}</div>;

const routes = {
    public: [{ path: '/', exact: true, component: page('home') }],
    private: [{ path: '/inventory', exact: true, component: page('inventory') }],
    admin: [{ path: '/admin', exact: true, component: page('admin') }],
};

const guest = {};
const player = { login: 'player', role: roles.NORMAL };
const admin = { login: 'admin', role: roles.ADMINISTRATOR };

const renderAt = (path, user) => render(
    <MemoryRouter initialEntries={[path]}>
        <AppSwitch routes={routes} user={user} fallback={page('not-found')} />
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

test('a guest gets not-found on private and admin pages', () => {
    const { unmount } = renderAt('/inventory', guest);
    expect(screen.getByText('not-found')).toBeInTheDocument();
    unmount();

    renderAt('/admin', guest);
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
            <AppSwitch routes={probeRoutes} user={user} fallback={page('not-found')} />
        </MemoryRouter>
    );

    const { rerender } = render(at(player));
    rerender(at({ ...player, avatar: 5 }));
    rerender(at({ ...player, balance: '90.00' }));

    expect(screen.getByText('probe')).toBeInTheDocument();
    expect(mounts).toBe(1);
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
