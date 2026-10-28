import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FooterLayout from './FooterLayout';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

test('the footer makes no claim about a captcha the site does not have, and links to pages that exist', () => {
    const { container } = render(
        <MemoryRouter>
            <FooterLayout />
        </MemoryRouter>,
    );

    expect(container.textContent).not.toMatch(/recaptcha/i);
    expect(Array.from(container.querySelectorAll('a')).map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
        ['footer.agreement', '/article/3'],
        ['footer.rules', '/article/6'],
        ['FAQ', '/faq'],
        ['footer.contacts', '/article/9'],
    ]);
});

test('the footer carries the site name and the current year', () => {
    render(
        <MemoryRouter>
            <FooterLayout />
        </MemoryRouter>,
    );

    expect(screen.getByText(`© ${new Date().getFullYear()} CASES.UA`)).toBeInTheDocument();
});
