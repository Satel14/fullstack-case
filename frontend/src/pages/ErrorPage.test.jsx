import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ErrorPage from './ErrorPage';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

test('the not-found page says so and offers the way back to the home page', () => {
    const { container } = render(
        <MemoryRouter initialEntries={['/nope']}>
            <ErrorPage />
        </MemoryRouter>,
    );

    expect(screen.getByText('error.notFound')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'error.goHome' })).toHaveAttribute('href', '/');
    expect(container.querySelector('.errorpage .errorpage-message')).not.toBeNull();
});
