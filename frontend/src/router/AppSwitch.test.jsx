import React from 'react';
import {
    act, render, screen, fireEvent,
} from '@testing-library/react';
import { MemoryRouter, Link } from 'react-router-dom';
import AppSwitch from './AppSwitch';
import ErrorPage from '../pages/ErrorPage';
import roles from '../enum/role';
import lazyPage from '../helpers/lazyPage';

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

test('a player who may not open the admin page gets a not-found tab title, not the admin one', () => {
    const adminRoutes = {
        public: [],
        private: [],
        admin: [{
            path: '/admin', exact: true, component: page('admin'), titleKey: 'admin.title',
        }],
    };
    render(
        <MemoryRouter initialEntries={['/admin']}>
            <AppSwitch routes={adminRoutes} user={player} sessionChecked fallback={ErrorPage} />
        </MemoryRouter>,
    );

    expect(screen.getByText('error.notFound')).toBeInTheDocument();
    expect(document.title).toBe('error.notFound — CASES.UA');
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

test.each(['public', 'private', 'admin'])('a pending %s chunk stays behind the loader until it resolves', async (group) => {
    let resolveChunk;
    const load = jest.fn(() => new Promise((resolve) => { resolveChunk = resolve; }));
    const lazyRoutes = {
        public: [], private: [], admin: [],
    };
    lazyRoutes[group] = [{ path: '/deferred/:id', component: lazyPage(load) }];
    const at = (user) => (
        <MemoryRouter initialEntries={['/deferred/7']}>
            <AppSwitch routes={lazyRoutes} user={user} sessionChecked fallback={page('not-found')} />
        </MemoryRouter>
    );
    const { container, rerender } = render(at(admin));

    expect(container.querySelector('.loader')).not.toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    rerender(at({ ...admin, balance: '90.00' }));
    expect(container.querySelector('.loader')).not.toBeNull();
    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => resolveChunk({ default: ({ match }) => <div>{`resolved page ${match.params.id}`}</div> }));

    expect(await screen.findByText('resolved page 7')).toBeInTheDocument();
    expect(container.querySelector('.loader')).toBeNull();
});

test('retrying a missing webpack chunk reloads the document to get the current deployment manifest', async () => {
    const { location } = window;
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    delete window.location;
    window.location = { reload: jest.fn() };
    try {
        const failure = Object.assign(new Error('Loading chunk 7 failed'), { name: 'ChunkLoadError' });
        const load = jest.fn(() => Promise.reject(failure));
        render(
            <MemoryRouter initialEntries={['/missing']}>
                <AppSwitch
                    routes={{ public: [{ path: '/missing', component: lazyPage(load) }], private: [], admin: [] }}
                    user={guest}
                    sessionChecked
                    fallback={page('not-found')}
                />
            </MemoryRouter>,
        );

        expect(await screen.findByRole('alert')).toHaveTextContent('common.loadFailed');
        fireEvent.click(screen.getByRole('button', { name: /common.retry/ }));

        expect(window.location.reload).toHaveBeenCalledTimes(1);
        expect(load).toHaveBeenCalledTimes(1);
    } finally {
        window.location = location;
        errors.mockRestore();
    }
});

test('a render error in a resolved lazy page still shows the crash notice', async () => {
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => { throw new Error('render failed'); };
    try {
        render(
            <MemoryRouter initialEntries={['/broken']}>
                <AppSwitch
                    routes={{ public: [{ path: '/broken', component: lazyPage(() => Promise.resolve({ default: Broken })) }], private: [], admin: [] }}
                    user={guest}
                    sessionChecked
                    fallback={page('not-found')}
                />
            </MemoryRouter>,
        );

        expect(await screen.findByRole('alert')).toHaveTextContent('crash.title');
        expect(screen.queryByText('common.loadFailed')).toBeNull();
    } finally {
        errors.mockRestore();
    }
});
