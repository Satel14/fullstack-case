import React from 'react';
import {
    render, screen, fireEvent, waitFor, act,
} from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import Cases from './Cases';
import uk from '../i18n/locales/uk/translation.json';
import en from '../i18n/locales/en/translation.json';

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
const shownHeadings = () => Array.from(document.querySelectorAll('.title-a__heading'))
    .map((node) => [node.firstChild.textContent, node.querySelector('span').textContent]);

let i18n;

const renderCases = () => render(<I18nextProvider i18n={i18n}><Cases /></I18nextProvider>);

beforeEach(async () => {
    i18n = createInstance();
    await i18n.use(initReactI18next).init({
        resources: { uk: { translation: uk }, en: { translation: en } },
        lng: 'uk',
        fallbackLng: 'uk',
        interpolation: { escapeValue: false },
    });
    getAllCases.mockResolvedValue({ data: CASES, categories: [] });
});

test('the price filter buckets cases by what one open costs', async () => {
    renderCases();
    await waitFor(() => expect(shownTitles()).toHaveLength(4));

    fireEvent.click(screen.getByText('20-49₴'));

    expect(shownTitles()).toEqual(['On sale', 'Cheap', 'Marked up']);

    fireEvent.click(screen.getByText('100+₴'));

    expect(shownTitles()).toEqual([]);
});

test('only cases sold below their price count as discounted', async () => {
    renderCases();
    await waitFor(() => expect(shownTitles()).toHaveLength(4));

    fireEvent.click(screen.getByText(i18n.t('cases.onlyDiscount')));

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

    renderCases();
    await waitFor(() => expect(shownTitles()).toHaveLength(5));

    expect(shownTitles()).toEqual(['Elite', 'On sale', 'Cheap', 'Mid', 'Marked up']);
    expect(Array.from(document.querySelectorAll('.title-a__heading')).map((node) => node.textContent))
        .toEqual(['Elitecases', 'Dailypicks']);
});

test('all five category slugs translate and switch languages while a legacy category keeps its stored heading', async () => {
    const categories = [
        { category_id: 4, category_slug: 'weapons', category_title: 'Weapon Cases' },
        { category_id: 5, category_slug: 'grades', category_title: 'By Rarity' },
        { category_id: 6, category_slug: 'knife-chance', category_title: 'Knife Chance' },
        { category_id: 7, category_slug: 'knives', category_title: 'Knife Cases' },
        { category_id: 1, category_slug: 'collections', category_title: 'CS2 Collections' },
        { category_id: 2, category_slug: null, category_title: 'Operation Cases' },
    ];
    getAllCases.mockResolvedValue({
        categories,
        data: categories.map((category) => ({
            case_id: `case-${category.category_id}`,
            case_title: `Case ${category.category_id}`,
            case_price: 10,
            case_categoryId: category.category_id,
        })),
    });
    const expectedHeadings = () => [
        ...categories.slice(0, 5).map(({ category_slug: slug }) => {
            const key = `cases.categories.${slug}`;
            expect(i18n.exists(`${key}.title`)).toBe(true);
            expect(i18n.exists(`${key}.subTitle`)).toBe(true);
            return [i18n.t(`${key}.title`), i18n.t(`${key}.subTitle`)];
        }),
        ['Operation', 'Cases'],
    ];

    renderCases();
    await waitFor(() => expect(shownTitles()).toHaveLength(6));

    expect(shownHeadings()).toEqual(expectedHeadings());
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(shownHeadings()).toEqual(expectedHeadings());
    expect(getAllCases).toHaveBeenCalledTimes(1);
});

test('a category with an unknown slug keeps its stored split heading', async () => {
    getAllCases.mockResolvedValue({
        categories: [{ category_id: 1, category_slug: 'future-section', category_title: 'Future Cases' }],
        data: CASES,
    });
    renderCases();
    await waitFor(() => expect(shownTitles()).toHaveLength(4));

    expect(shownHeadings()).toEqual([['Future', 'Cases']]);
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(shownHeadings()).toEqual([['Future', 'Cases']]);
});

test('Reset clears the search box along with the filters', async () => {
    renderCases();
    await waitFor(() => expect(shownTitles()).toHaveLength(4));
    const search = screen.getByPlaceholderText(i18n.t('cases.searchPlaceholder'));

    fireEvent.change(search, { target: { value: 'cheap' } });
    fireEvent.click(screen.getByText(i18n.t('cases.onlyDiscount')));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('cases.reset')) }));

    expect(search).toHaveValue('');
    expect(shownTitles()).toEqual(['On sale', 'Cheap', 'Mid', 'Marked up']);
    expect(screen.queryByRole('button', { name: new RegExp(i18n.t('cases.reset')) })).toBeNull();

    fireEvent.click(screen.getByText('20-49₴'));
    expect(shownTitles()).toEqual(['On sale', 'Cheap', 'Marked up']);
});

test('a text search is narrowed by the other filters, and a search with no match stays empty', async () => {
    renderCases();
    await waitFor(() => expect(shownTitles()).toHaveLength(4));
    const search = screen.getByPlaceholderText(i18n.t('cases.searchPlaceholder'));

    fireEvent.change(search, { target: { value: 'A' } });
    expect(shownTitles()).toEqual(['On sale', 'Cheap', 'Marked up']);

    fireEvent.click(screen.getByText(i18n.t('cases.onlyDiscount')));
    expect(shownTitles()).toEqual(['On sale']);

    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(shownTitles()).toEqual([]);

    fireEvent.click(screen.getByText('20-49₴'));
    expect(shownTitles()).toEqual([]);
});

test('when the cases cannot be loaded the page says so instead of staying blank, and loads them on retry', async () => {
    getAllCases.mockRejectedValueOnce({ error: 500 });
    renderCases();

    expect(await screen.findByText(i18n.t('common.loadFailed'))).toBeInTheDocument();
    expect(shownTitles()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('common.retry')) }));

    await waitFor(() => expect(shownTitles()).toHaveLength(4));
    expect(screen.queryByText(i18n.t('common.loadFailed'))).toBeNull();
    expect(getAllCases).toHaveBeenCalledTimes(2);
});

test('a search that matches no case says that nothing was found', async () => {
    renderCases();
    await waitFor(() => expect(shownTitles()).toHaveLength(4));
    expect(screen.queryByText(i18n.t('cases.nothingFound'))).toBeNull();

    fireEvent.change(screen.getByPlaceholderText(i18n.t('cases.searchPlaceholder')), { target: { value: 'zzz' } });

    expect(screen.getByText(i18n.t('cases.nothingFound'))).toBeInTheDocument();
    expect(shownTitles()).toEqual([]);

    fireEvent.change(screen.getByPlaceholderText(i18n.t('cases.searchPlaceholder')), { target: { value: 'mid' } });

    expect(screen.queryByText(i18n.t('cases.nothingFound'))).toBeNull();
    expect(shownTitles()).toEqual(['Mid']);
});
