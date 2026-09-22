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
    renderAt('/inventory', guest);
    expect(screen.getByText('not-found')).toBeInTheDocument();
});

test('an authorized user gets not-found on an unknown page', () => {
    renderAt('/nope', admin);
    expect(screen.getByText('not-found')).toBeInTheDocument();
});
