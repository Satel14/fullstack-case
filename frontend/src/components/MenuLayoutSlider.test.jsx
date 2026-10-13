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

const renderMenu = (user) => render(
    <Provider store={createStore(() => ({ user }))}>
        <MemoryRouter>
            <MenuLayoutSlider />
        </MemoryRouter>
    </Provider>,
);

test('the menu renders its links and the language switcher without a placeholder socials block', () => {
    const { container } = renderMenu({ id: null, login: '', role: 1 });

    expect(screen.getByText('menu.cases')).toBeInTheDocument();
    expect(screen.getByText('menu.login')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'UK' })).toBeInTheDocument();
    expect(screen.queryByText('Some socials')).toBeNull();
    expect(container.querySelector('.social')).toBeNull();
});
