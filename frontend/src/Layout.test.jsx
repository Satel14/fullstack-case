import React from 'react';
import {
    act, fireEvent, render, screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

jest.mock('./components/HeaderSecond', () => (props) => (
    <header>
        {props.onOpenMenu && <button type="button" onClick={props.onOpenMenu}>open menu</button>}
        <button type="button" onClick={() => global.Layout.onCollapseChat(false)}>open chat</button>
    </header>
));
jest.mock('./components/HeaderThird', () => () => null);
jest.mock('./components/FooterLayout', () => () => null);
jest.mock('./components/SiteLogo', () => () => <div>logo</div>);
jest.mock('./components/MenuLayoutSlider', () => () => {
    const { Link } = jest.requireActual('react-router-dom');
    return (
        <nav>
            <Link to="/">cases</Link>
            <Link to="/top">top players</Link>
        </nav>
    );
});
jest.mock('./components/chat/Chat', () => ({ enabled }) => {
    const { Link } = jest.requireActual('react-router-dom');
    return (
        <div>
            {`chat ${enabled ? 'on' : 'off'}`}
            <button type="button" onClick={() => global.Layout.onCollapseChat(true)}>hide chat</button>
            <Link to="/profile/9">player in chat</Link>
        </div>
    );
});

const originalMatchMedia = window.matchMedia;
let lists;

const setScreenWidth = (width) => {
    const matches = (query) => {
        const [, kind, px] = query.match(/\((min|max)-width: (\d+)px\)/);
        return kind === 'min' ? width >= Number(px) : width <= Number(px);
    };
    if (!lists) {
        lists = {};
        window.matchMedia = (query) => {
            if (!lists[query]) {
                const listeners = new Set();
                lists[query] = {
                    matches: matches(query),
                    addEventListener: (event, listener) => listeners.add(listener),
                    removeEventListener: (event, listener) => listeners.delete(listener),
                    listeners,
                };
            }
            return lists[query];
        };
    }
    Object.entries(lists).forEach(([query, list]) => {
        const next = matches(query);
        if (list.matches !== next) {
            Object.assign(list, { matches: next });
            list.listeners.forEach((listener) => listener({ matches: next }));
        }
    });
    window.matchMedia.width = width;
};

const renderLayout = (width) => {
    lists = null;
    setScreenWidth(width);
    return render(
        <MemoryRouter initialEntries={['/']}>
            <Layout>
                <div>page</div>
            </Layout>
        </MemoryRouter>,
    );
};

const menuDrawerOpen = () => document.querySelector('.menu-drawer.ant-drawer-open') !== null;
const chatDrawerOpen = () => document.querySelector('.chat-drawer.ant-drawer-open') !== null;

beforeEach(() => {
    localStorage.clear();
    window.HeaderSecond = { chatButtonStatusHeader: jest.fn() };
});

afterEach(() => {
    window.matchMedia = originalMatchMedia;
    jest.restoreAllMocks();
});

test('a desktop screen docks the menu and the chat beside the page', () => {
    renderLayout(1400);

    expect(document.querySelector('.slider-left')).not.toBeNull();
    expect(document.querySelector('.slider-right')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'open menu' })).not.toBeInTheDocument();
    expect(screen.getByText('chat on')).toBeInTheDocument();
});

test('a phone docks nothing: the menu opens from the header and closes after a link is followed', () => {
    renderLayout(390);

    expect(document.querySelector('.slider-left')).toBeNull();
    expect(document.querySelector('.slider-right')).toBeNull();
    expect(screen.queryByText('top players')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'open menu' }));
    expect(menuDrawerOpen()).toBe(true);

    fireEvent.click(screen.getByText('top players'));
    expect(menuDrawerOpen()).toBe(false);
});

test('a phone keeps the chat closed, even for a player who keeps it open on the desktop, until the header opens it; the header button stays for focus to return to', () => {
    localStorage.setItem('collapsedChat', 'false');
    renderLayout(390);

    expect(screen.queryByText('chat on')).not.toBeInTheDocument();
    expect(window.HeaderSecond.chatButtonStatusHeader).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'open chat' }));
    expect(chatDrawerOpen()).toBe(true);
    expect(screen.getByText('chat on')).toBeInTheDocument();
    expect(window.HeaderSecond.chatButtonStatusHeader).not.toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole('button', { name: 'hide chat' }));
    expect(chatDrawerOpen()).toBe(false);
    expect(screen.getByText('chat off')).toBeInTheDocument();
    expect(window.HeaderSecond.chatButtonStatusHeader).toHaveBeenLastCalledWith(true);
    expect(localStorage.getItem('collapsedChat')).toBe('false');
});

test('a tablet keeps the menu docked but floats the chat over the page', () => {
    renderLayout(1024);

    expect(document.querySelector('.slider-left')).not.toBeNull();
    expect(document.querySelector('.slider-right')).toBeNull();
    expect(screen.queryByRole('button', { name: 'open menu' })).not.toBeInTheDocument();
    expect(screen.queryByText('chat on')).not.toBeInTheDocument();
});

test('narrowing the window swaps the docked panels for the floating ones', () => {
    renderLayout(1400);
    expect(document.querySelector('.slider-left')).not.toBeNull();

    act(() => setScreenWidth(390));

    expect(document.querySelector('.slider-left')).toBeNull();
    expect(document.querySelector('.slider-right')).toBeNull();
    expect(screen.getByRole('button', { name: 'open menu' })).toBeInTheDocument();
    expect(window.HeaderSecond.chatButtonStatusHeader).toHaveBeenLastCalledWith(true);
});

test('widening the window and narrowing it again does not bring back a menu or chat left open', () => {
    renderLayout(390);
    fireEvent.click(screen.getByRole('button', { name: 'open menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'open chat' }));
    expect(menuDrawerOpen()).toBe(true);
    expect(chatDrawerOpen()).toBe(true);

    act(() => setScreenWidth(1400));
    act(() => setScreenWidth(390));

    expect(menuDrawerOpen()).toBe(false);
    expect(chatDrawerOpen()).toBe(false);
});

test('blocked site storage leaves the page working', () => {
    const blocked = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);

    renderLayout(1400);
    expect(screen.getByText('page')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'hide chat' }));

    expect(screen.getByText('chat off')).toBeInTheDocument();
});

test('tapping the link of the page already open closes the menu as well', () => {
    renderLayout(390);
    fireEvent.click(screen.getByRole('button', { name: 'open menu' }));
    expect(menuDrawerOpen()).toBe(true);

    fireEvent.click(screen.getByText('cases'));

    expect(menuDrawerOpen()).toBe(false);
});

test('following a link from the floating chat closes it, so the page it opens is not hidden behind it', () => {
    renderLayout(390);
    fireEvent.click(screen.getByRole('button', { name: 'open chat' }));
    expect(chatDrawerOpen()).toBe(true);

    fireEvent.click(screen.getByText('player in chat'));

    expect(chatDrawerOpen()).toBe(false);
});
