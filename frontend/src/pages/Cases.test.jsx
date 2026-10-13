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
    {
 case_id: 'onsale', case_title: 'On sale', case_price: 150, case_discount: 40, case_categoryId: 1,
},
    {
 case_id: 'cheap', case_title: 'Cheap', case_price: 30, case_discount: 0, case_categoryId: 1,
},
    {
 case_id: 'mid', case_title: 'Mid', case_price: 60, case_discount: null, case_categoryId: 1,
},
    {
 case_id: 'marked-up', case_title: 'Marked up', case_price: 10, case_discount: 45, case_categoryId: 1,
},
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

test('with categories, every category lists its own cases under its title', async () => {
    getAllCases.mockResolvedValue({
        data: [...CASES, {
            case_id: 'elite', case_title: 'Elite', case_price: 500, case_discount: 0, case_categoryId: 2,
        }],
        categories: [
            { category_id: 2, category_title: 'Elite cases', category_titleHelp: '' },
            { category_id: 1, category_title: 'Daily picks', category_titleHelp: '' },
        ],
    });

    render(<Cases />);
    await waitFor(() => expect(shownTitles()).toHaveLength(5));

    expect(shownTitles()).toEqual(['Elite', 'On sale', 'Cheap', 'Mid', 'Marked up']);
    expect(Array.from(document.querySelectorAll('.title-a__heading')).map((node) => node.textContent))
        .toEqual(['Elitecases', 'Dailypicks']);
});

test('a text search is narrowed by the other filters, and a search with no match stays empty', async () => {
    render(<Cases />);
    await waitFor(() => expect(shownTitles()).toHaveLength(4));
    const search = screen.getByPlaceholderText('cases.searchPlaceholder');

    fireEvent.change(search, { target: { value: 'A' } });
    expect(shownTitles()).toEqual(['On sale', 'Cheap', 'Marked up']);

    fireEvent.click(screen.getByText('cases.onlyDiscount'));
    expect(shownTitles()).toEqual(['On sale']);

    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(shownTitles()).toEqual([]);

    fireEvent.click(screen.getByText('20-49₴'));
    expect(shownTitles()).toEqual([]);
});
