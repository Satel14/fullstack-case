import React from 'react';
import { render, screen } from '@testing-library/react';
import ItemColor from './ItemColor';

test('a painted item gets a dot that names its colour to screen readers', () => {
    render(<ItemColor color="painted" />);

    expect(screen.getByRole('img', { name: 'Painted' })).toHaveClass('item-color');
});

test('the default colour shows no dot', () => {
    const { container } = render(<ItemColor color="default" />);

    expect(container.querySelector('.item-color')).toBeNull();
});
