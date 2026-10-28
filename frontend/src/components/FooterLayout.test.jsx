import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FooterLayout from './FooterLayout';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

test('the footer carries the site name and the current year', () => {
    render(
        <MemoryRouter>
            <FooterLayout />
        </MemoryRouter>,
    );

    expect(screen.getByText(`© ${new Date().getFullYear()} CASES.UA`)).toBeInTheDocument();
});
