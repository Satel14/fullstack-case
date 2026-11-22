import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { MemoryRouter } from 'react-router-dom';
import MenuLayoutSlider from './MenuLayoutSlider';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'uk', changeLanguage: () => {} } }),
    withTranslation: () => (Component) => (props) => <Component {...props} t={(key) => key} />,
}));

const renderMenu = async (user, path = '/') => {
    let view;
    await act(async () => {
        view = render(
            <Provider store={createStore(() => ({ user }))}>
                <MemoryRouter initialEntries={[path]}>
                    <MenuLayoutSlider />
                </MemoryRouter>
            </Provider>,
        );
    });
    await act(() => new Promise((resolve) => window.requestAnimationFrame(resolve)));
    return view;
};

const guest = { id: null, login: '', role: 1 };
const player = { id: 7, login: 'player', role: 1 };

const highlighted = (container) => Array.from(container.querySelectorAll('.ant-menu-item-selected'))
    .map((node) => node.textContent);

test.each([
        ['/', guest, ['menu.cases']],
        ['/case/dust2', guest, ['menu.cases']],
        ['/upgrade', guest, ['menu.upgrade']],
        ['/upgrade/', player, ['menu.upgrade']],
        ['/top', guest, ['menu.topPlayers']],
        ['/top/', guest, ['menu.topPlayers']],
        ['/bonus', guest, ['menu.bonus']],
        ['/faq', guest, ['menu.faq']],
        ['/article/8', guest, ['menu.moreMoney']],
        ['/login', guest, ['menu.login']],
        ['/provably-fair', player, ['provablyFair.title']],
        ['/provably-fair', guest, ['provablyFair.title']],
        ['/inventory', player, ['inventory.title']],
])('the menu highlights the item for %s', async (path, user, expected) => {
    const { container } = await renderMenu(user, path);
    expect(highlighted(container)).toEqual(expected);
});

test.each([
        ['/Top', guest, ['menu.topPlayers']],
        ['/UPGRADE', guest, ['menu.upgrade']],
        ['/Case/dust2', guest, ['menu.cases']],
        ['/INVENTORY', player, ['inventory.title']],
])('the highlight ignores letter case in %s, as the routes do', async (path, user, expected) => {
    const { container } = await renderMenu(user, path);
    expect(highlighted(container)).toEqual(expected);
});

test.each(['/settings', '/profile/3', '/article/3', '/deposit'])('the page %s without a menu item highlights nothing', async (path) => {
    const { container } = await renderMenu(player, path);
    expect(highlighted(container)).toEqual([]);
});

test('the menu renders its links and the language switcher without a placeholder socials block', async () => {
    const { container } = await renderMenu(guest);

    expect(screen.getByText('menu.cases')).toBeInTheDocument();
    expect(screen.getByText('menu.login')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'UK' })).toBeInTheDocument();
    expect(screen.queryByText('Some socials')).toBeNull();
    expect(container.querySelector('.social')).toBeNull();
});

test.each([guest, player])('upgrade follows cases in the menu for $login', async (user) => {
    await renderMenu(user);
    const links = screen.getAllByRole('link');
    const casesIndex = links.findIndex((link) => link.textContent === 'menu.cases');
    expect(links[casesIndex + 1]).toHaveTextContent('menu.upgrade');
    expect(links[casesIndex + 1]).toHaveAttribute('href', '/upgrade');
});
