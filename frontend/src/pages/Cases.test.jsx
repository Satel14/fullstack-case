import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import Cases from './Cases';

jest.mock('react-i18next', () => {
    const mockReact = require('react');
    const t = (key) => key;
    return {
        useTranslation: () => ({ t }),
        withTranslation: () => (Component) => (props) => mockReact.createElement(Component, { ...props, t }),
    };
});

jest.mock('react-reveal/Flip', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('../api/all/cases', () => ({ getAllCases: jest.fn() }));
jest.mock('../components/mini/CaseMini', () => ({ data }) => <div className="mini">{data.case_title}</div>);

const { getAllCases } = require('../api/all/cases');

const CASES = [
    { case_id: 'onsale', case_title: 'On sale', case_price: 150, case_discount: 40, case_categoryId: 1 },
    { case_id: 'cheap', case_title: 'Cheap', case_price: 30, case_discount: 0, case_categoryId: 1 },
    { case_id: 'mid', case_title: 'Mid', case_price: 60, case_discount: null, case_categoryId: 1 },
    { case_id: 'marked-up', case_title: 'Marked up', case_price: 10, case_discount: 45, case_categoryId: 1 },
];

const shownTitles = () => Array.from(document.querySelectorAll('.mini')).map((node) => node.textContent);

beforeEach(() => {
    getAllCases.mockResolvedValue({ data: CASES, categories: [] });
});

test('the price filter buckets cases by what one open costs', async () => {
    render(<Cases />);
    await waitFor(() => expect(shownTitles()).toHaveLength(4));

    fireEvent.click(screen.getByText('20-49₴'));

    expect(shownTitles()).toEqual(['On sale', 'Cheap', 'Marked up']);

    fireEvent.click(screen.getByText('100+₴'));

    expect(shownTitles()).toEqual([]);
});

test('only cases sold below their price count as discounted', async () => {
    render(<Cases />);
    await waitFor(() => expect(shownTitles()).toHaveLength(4));

    fireEvent.click(screen.getByText('cases.onlyDiscount'));

    expect(shownTitles()).toEqual(['On sale']);
});
