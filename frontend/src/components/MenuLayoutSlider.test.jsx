import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { MemoryRouter } from 'react-router-dom';
import MenuLayoutSlider from './MenuLayoutSlider';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'uk', changeLanguage: () => {} } }),
    withTranslation: () => (Component) => (props) => <Component {...props} t={(key) => key} />,
}));

const renderMenu = (user, path = '/') => render(
    <Provider store={createStore(() => ({ user }))}>
        <MemoryRouter initialEntries={[path]}>
            <MenuLayoutSlider />
        </MemoryRouter>
    </Provider>,
);

const guest = { id: null, login: '', role: 1 };
const player = { id: 7, login: 'player', role: 1 };

const highlighted = (container) => Array.from(container.querySelectorAll('.ant-menu-item-selected'))
    .map((node) => node.textContent);

test('the menu highlights the item of the page that is open', () => {
    const cases = [
        ['/', guest, ['menu.cases']],
        ['/case/dust2', guest, ['menu.cases']],
        ['/top', guest, ['menu.topPlayers']],
        ['/top/', guest, ['menu.topPlayers']],
        ['/bonus', guest, ['menu.bonus']],
        ['/faq', guest, ['menu.faq']],
        ['/article/8', guest, ['menu.moreMoney']],
        ['/login', guest, ['menu.login']],
        ['/provably-fair', player, ['provablyFair.title']],
        ['/inventory', player, ['inventory.title']],
    ];
    cases.forEach(([path, user, expected]) => {
        const { container, unmount } = renderMenu(user, path);
        expect([path, highlighted(container)]).toEqual([path, expected]);
        unmount();
    });
});

test('a page without its own menu item highlights nothing', () => {
    ['/settings', '/profile/3', '/article/3', '/deposit'].forEach((path) => {
        const { container, unmount } = renderMenu(player, path);
        expect([path, highlighted(container)]).toEqual([path, []]);
        unmount();
    });
});

test('the menu renders its links and the language switcher without a placeholder socials block', () => {
    const { container } = renderMenu(guest);

    expect(screen.getByText('menu.cases')).toBeInTheDocument();
    expect(screen.getByText('menu.login')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'UK' })).toBeInTheDocument();
    expect(screen.queryByText('Some socials')).toBeNull();
    expect(container.querySelector('.social')).toBeNull();
});
