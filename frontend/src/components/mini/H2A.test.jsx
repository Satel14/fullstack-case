import React from 'react';
import { render, screen } from '@testing-library/react';
import H2A from './H2A';
import '../../i18n';

test('the heading has both decorative lines using the classes styled by the stylesheet', () => {
    const { container } = render(<H2A title="Heading" subTitle="Subtitle" />);

    expect(screen.getByText('Heading')).toHaveClass('title-a__heading');
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
    expect(container.querySelector('.title-a__l')).toBeInTheDocument();
    expect(container.querySelector('.title-a__r')).toBeInTheDocument();
});
