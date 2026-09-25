import React from 'react';
import { render } from '@testing-library/react';
import CasePrice from './CasePrice';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

const shown = (data, count) => {
    const { container } = render(<CasePrice data={data} count={count} />);
    const current = container.querySelector('.case-price');
    const old = container.querySelector('.case-price-old');
    return {
        current: current ? current.textContent : null,
        old: old ? old.textContent : null,
    };
};

test('a case without a sale price shows its price', () => {
    expect(shown({ case_price: 100, case_discount: 0 })).toEqual({ current: '100₴', old: null });
    expect(shown({ case_price: 100, case_discount: null })).toEqual({ current: '100₴', old: null });
});

test('a sale price below the price is shown as a discount', () => {
    expect(shown({ case_price: 100, case_discount: 80 })).toEqual({ current: '80₴', old: '100₴' });
});

test('a sale price at or above the price is not dressed up as a discount', () => {
    expect(shown({ case_price: 1453, case_discount: 2000 })).toEqual({ current: '2000₴', old: null });
    expect(shown({ case_price: 100, case_discount: 100 })).toEqual({ current: '100₴', old: null });
});

test('the count multiplies what is shown', () => {
    expect(shown({ case_price: 100, case_discount: 0 }, '20')).toEqual({ current: '2000₴', old: null });
    expect(shown({ case_price: 100, case_discount: 80 }, '20')).toEqual({ current: '1600₴', old: '2000₴' });
});
