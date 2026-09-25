import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { MemoryRouter } from 'react-router-dom';
import OpenCase from './OpenCase';

jest.mock('react-i18next', () => {
    const mockReact = require('react');
    const t = (key) => key;
    return {
        useTranslation: () => ({ t }),
        withTranslation: () => (Component) => (props) => mockReact.createElement(Component, { ...props, t }),
    };
});

jest.mock('react-reveal/Fade', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('react-reveal/Zoom', () => ({ __esModule: true, default: ({ children }) => children }));

jest.mock('../../api/all/cases', () => ({ openCaseById: jest.fn() }));
jest.mock('../../api/all/storage', () => ({ sellItemByStorageId: jest.fn() }));
jest.mock('../../api/all/item', () => ({ getItemPriceById: jest.fn() }));
jest.mock('../mini/openNotification', () => jest.fn());

const { openCaseById } = require('../../api/all/cases');
const openNotification = require('../mini/openNotification');

const baseCase = {
    case_id: 'havoc',
    case_title: 'Havoc',
    case_img: '/havoc.png',
    case_price: 100,
    case_discount: 0,
    case_openLimit: -1,
    case_openedCount: 0,
};

const renderOpenCase = (data = baseCase, props = {}) => {
    const store = createStore(() => ({ user: { login: 'player' }, itemCache: {}, modules: {} }));
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <OpenCase data={data} {...props} />
            </MemoryRouter>
        </Provider>,
    );
};

const openControlsAreBack = () => {
    expect(screen.getByRole('button', { name: /openCase\.open$/ })).toBeInTheDocument();
    expect(document.querySelector('.opencase-blocklist')).toBeNull();
};

beforeEach(() => {
    openCaseById.mockReset();
    openNotification.mockReset();
    window.HeaderSecond = { changeBalance: jest.fn() };
});

test('a refused open shows the reason the server gave', async () => {
    const reason = 'Перевищено ліміт відкриттів кейсу';
    openCaseById.mockRejectedValue({ error: 422, message: reason });
    renderOpenCase();

    fireEvent.click(screen.getByRole('button', { name: /openCase\.open$/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', reason));
    expect(openNotification).toHaveBeenCalledTimes(1);
    openControlsAreBack();
});

test('a failed open without a reason reports a server error, not missing funds', async () => {
    openCaseById.mockRejectedValue({ error: 500 });
    renderOpenCase();

    fireEvent.click(screen.getByRole('button', { name: /openCase\.fast$/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'common.serverError'));
    openControlsAreBack();
});

test.each([
    ['an unexpected backend error', { error: 400, message: "Cannot read properties of null (reading 'name')" }],
    ['a network failure', new TypeError('Failed to fetch')],
])('%s is reported as a server error, not as raw text', async (name, failure) => {
    openCaseById.mockRejectedValue(failure);
    renderOpenCase();

    fireEvent.click(screen.getByRole('button', { name: /openCase.fast$/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'common.serverError'));
    expect(openNotification).toHaveBeenCalledTimes(1);
    openControlsAreBack();
});

test('a rate-limited open shows the limiter message', async () => {
    openCaseById.mockRejectedValue({ error: 429, message: 'Забагато відкриттів' });
    renderOpenCase();

    fireEvent.click(screen.getByRole('button', { name: /openCase.fast$/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'Забагато відкриттів'));
});

test('an open refused for missing funds in block mode brings the open controls back', async () => {
    openCaseById.mockResolvedValue({ status: 200, message: 'Недостатньо грошей' });
    renderOpenCase();

    fireEvent.click(screen.getByRole('button', { name: /openCase\.openBlocks$/ }));
    fireEvent.click(document.querySelector('.opencase-blocklist .front'));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'Недостатньо грошей'));
    openControlsAreBack();
});

test('an open rejected by the server in block mode brings the open controls back', async () => {
    openCaseById.mockRejectedValue({ error: 429, message: 'Забагато відкриттів. Зачекайте трохи.' });
    renderOpenCase();

    fireEvent.click(screen.getByRole('button', { name: /openCase\.openBlocks$/ }));
    fireEvent.click(document.querySelector('.opencase-blocklist .front'));

    await waitFor(() => expect(openNotification).toHaveBeenCalled());
    openControlsAreBack();
});

const shownPrice = () => document.querySelector('.casepage-price .case-price').textContent;

test('the price shown follows the selected count and the sale price', () => {
    renderOpenCase({ ...baseCase, case_price: 100, case_discount: 80 });

    expect(shownPrice()).toBe('80₴');
    fireEvent.click(screen.getByText('5'));
    expect(shownPrice()).toBe('400₴');
});

test('a successful open asks the page to refresh the case', async () => {
    const { getItemPriceById } = require('../../api/all/item');
    getItemPriceById.mockResolvedValue({ prices: { default: 10 } });
    const item = {
        id: 'ak', color: 'default', name: 'AK', rare: 'Field-Tested', type: 'rifles',
    };
    openCaseById.mockResolvedValue({
        status: 200,
        balance: 900,
        data: [{ winner: { item, winIndex: 71, storageId: 5 }, resultWithItem: [item] }],
    });
    const onCaseChanged = jest.fn();
    renderOpenCase(baseCase, { onCaseChanged });

    fireEvent.click(screen.getByRole('button', { name: /openCase\.fast$/ }));

    await waitFor(() => expect(onCaseChanged).toHaveBeenCalledTimes(1));
    expect(window.HeaderSecond.changeBalance).toHaveBeenCalledWith(900);
});

test('an open refused by the server also refreshes the case', async () => {
    openCaseById.mockRejectedValue({ error: 422, message: 'Перевищено ліміт відкриттів кейсу' });
    const onCaseChanged = jest.fn();
    renderOpenCase(baseCase, { onCaseChanged });

    fireEvent.click(screen.getByRole('button', { name: /openCase\.fast$/ }));

    await waitFor(() => expect(onCaseChanged).toHaveBeenCalledTimes(1));
});
