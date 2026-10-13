import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { MemoryRouter } from 'react-router-dom';
import itemCacheReducer from '../../store/reducers/itemCache';
import OpenCase from './OpenCase';

jest.mock('react-i18next', () => {
    const mockReact = require('react');
    const t = (key, options) => (options ? `${key} ${JSON.stringify(options)}` : key);
    return {
        useTranslation: () => ({ t }),
        withTranslation: () => (Component) => (props) => mockReact.createElement(Component, { ...props, t }),
    };
});

jest.mock('react-reveal/Fade', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('react-reveal/Zoom', () => ({ __esModule: true, default: ({ children }) => children }));

jest.mock('../../api/all/cases', () => ({ openCaseById: jest.fn() }));
jest.mock('../../api/all/storage', () => ({ sellItemByStorageId: jest.fn() }));
jest.mock('../../api/all/item', () => ({ getItemsInfo: jest.fn() }));
jest.mock('../mini/openNotification', () => jest.fn());

const { openCaseById } = require('../../api/all/cases');
const { getItemsInfo } = require('../../api/all/item');
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

const renderOpenCase = (data = baseCase, props = {}, itemCache = {}) => {
    const store = createStore(
        combineReducers({
            user: (state = { login: 'player' }) => state,
            itemCache: itemCacheReducer,
            modules: (state = {}) => state,
        }),
        { itemCache },
        applyMiddleware(thunk),
    );
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

    fireEvent.click(screen.getByRole('button', { name: /openCase\.fast$/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'common.serverError'));
    expect(openNotification).toHaveBeenCalledTimes(1);
    openControlsAreBack();
});

test('a player banned mid-session is told the account is blocked', async () => {
    openCaseById.mockRejectedValue({ error: 403, message: 'Ваш акаунт заблоковано' });
    renderOpenCase();

    fireEvent.click(screen.getByRole('button', { name: /openCase\.fast$/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'Ваш акаунт заблоковано'));
});

test('a rate-limited open shows the limiter message', async () => {
    openCaseById.mockRejectedValue({ error: 429, message: 'Забагато відкриттів' });
    renderOpenCase();

    fireEvent.click(screen.getByRole('button', { name: /openCase\.fast$/ }));

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

const wonItem = (id, color) => ({
    id, color, name: `Gun ${id}`, rare: 'Field-Tested', type: 'rifles',
});

const openTwo = () => {
    const items = [wonItem(101, 'painted'), wonItem(102, 'default')];
    openCaseById.mockResolvedValue({
        status: 200,
        balance: 900,
        data: items.map((item, i) => ({ winner: { item, winIndex: 71, storageId: 50 + i }, resultWithItem: [item] })),
    });
};

const cachedGuns = {
    101: { item_itemId: 101, item_name: 'Gun 101', pricesInCredits: { default: 10, painted: 25 } },
    102: { item_itemId: 102, item_name: 'Gun 102', pricesInCredits: { default: 4, painted: 6 } },
};

test('the prices of the won items come from the item cache without any request', async () => {
    openTwo();
    renderOpenCase(baseCase, {}, cachedGuns);

    fireEvent.click(screen.getByRole('button', { name: /openCase\.fast$/ }));

    expect(await screen.findByText('openCase.sellFor {"price":25}')).toBeInTheDocument();
    expect(screen.getByText('openCase.sellFor {"price":4}')).toBeInTheDocument();
    expect(screen.getByText('openCase.sellAllFor {"sum":"29.00"}')).toBeInTheDocument();
    expect(getItemsInfo).not.toHaveBeenCalled();
});

test('won items that are not cached are fetched with one request', async () => {
    openTwo();
    getItemsInfo.mockResolvedValue({ status: 200, data: cachedGuns });
    renderOpenCase();

    fireEvent.click(screen.getByRole('button', { name: /openCase\.fast$/ }));

    expect(await screen.findByText('openCase.sellFor {"price":25}')).toBeInTheDocument();
    expect(screen.getByText('openCase.sellFor {"price":4}')).toBeInTheDocument();
    expect(getItemsInfo).toHaveBeenCalledTimes(1);
    expect(getItemsInfo.mock.calls[0][0].sort()).toEqual(['101', '102']);
});

test('a won item without a price offers no sell button for it', async () => {
    openTwo();
    renderOpenCase(baseCase, {}, { ...cachedGuns, 102: { item_itemId: 102, item_name: 'Gun 102', pricesInCredits: null } });

    fireEvent.click(screen.getByRole('button', { name: /openCase\.fast$/ }));

    expect(await screen.findByText('openCase.sellFor {"price":25}')).toBeInTheDocument();
    expect(screen.getAllByText(/openCase\.sellFor/)).toHaveLength(1);
    expect(screen.getByText('openCase.sellAllFor {"sum":"25.00"}')).toBeInTheDocument();
});
