import React from 'react';
import {
    act, render, screen, fireEvent,
} from '@testing-library/react';
import i18n from '../../i18n';
import ItemColor from './ItemColor';

afterAll(() => i18n.changeLanguage('uk'));

test('a painted item gets a dot that names its colour in the site language, to screen readers and on hover', async () => {
    await act(async () => { await i18n.changeLanguage('uk'); });
    render(<ItemColor color="painted" />);

    const dot = screen.getByRole('img', { name: 'Пофарбований' });
    expect(dot).toHaveClass('item-color');
    fireEvent.mouseEnter(dot);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Пофарбований');

    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByRole('img', { name: 'Painted' })).toBe(dot);
});

test('the default colour shows no dot', () => {
    const { container } = render(<ItemColor color="default" />);

    expect(container.querySelector('.item-color')).toBeNull();
});
