import React from 'react';
import { render, screen, within } from '@testing-library/react';
import UpgradeRing from './UpgradeRing';
import i18n from '../../i18n';

const target = {
    itemId: 51, color: 'default', name: 'Target skin', grade: 'covert', price: 20,
};
const props = {
    threshold: 450000,
    stakeKop: 1000,
    targetKop: 2000,
    target,
    rolling: false,
    reducedMotion: false,
    result: null,
    formatPrice: (kop) => i18n.t('upgrade.price', { value: (kop / 100).toFixed(2) }),
};

test.each([true, false])('the same live region announces won=%p and remains mounted when cleared', (won) => {
    const { rerender } = render(<UpgradeRing {...props} />);
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    expect(liveRegion).toBeEmptyDOMElement();
    rerender(<UpgradeRing {...props} result={{ won, target }} />);
    expect(screen.getByRole('status')).toBe(liveRegion);
    expect(liveRegion).toHaveTextContent(i18n.t(won ? 'upgrade.won' : 'upgrade.lost'));
    expect(within(liveRegion).getByRole('heading')).toHaveFocus();
    rerender(<UpgradeRing {...props} />);
    expect(screen.getByRole('status')).toBe(liveRegion);
    expect(liveRegion).toBeEmptyDOMElement();
});
