import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SiteLogo from './SiteLogo';

test('the logo links home as CASES.UA and shrinks to the site icon, not to another name', () => {
    const { container } = render(<MemoryRouter><SiteLogo /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'CASES.UA' })).toHaveAttribute('href', '/');
    expect(`${container.querySelector('.full').textContent}${container.querySelector('a span').textContent}`).toBe('CASES.ua');
    expect(container.querySelector('.low')).toHaveAttribute('src', '/favicon.svg');
    expect(container.textContent).not.toMatch(/GO/);
});
