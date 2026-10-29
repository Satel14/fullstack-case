import React from 'react';
import {
    render, screen, fireEvent, waitFor, act,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import itemCacheReducer from '../../store/reducers/itemCache';
import OpenCase from './OpenCase';

jest.mock('react-i18next', () => {
    const mockReact = require('react');
    const t = (key, options) => (options ? `${key} ${JSON.stringify(options)}` : key);
    return {
        useTranslation: () => ({ t }),
        withTranslation: () => (Component) => (props) => mockReact.createElement(Component, { ...props, t }),
        initReactI18next: { type: '3rdParty', init: () => {} },
    };
});

jest.mock('react-reveal/Fade', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('react-reveal/Zoom', () => ({ __esModule: true, default: ({ children }) => children }));

jest.mock('../../api/all/cases', () => ({ openCaseById: jest.fn() }));
jest.mock('../../api/all/storage', () => ({ sellItemByStorageId: jest.fn() }));
jest.mock('../../api/all/item', () => ({ getItemsInfo: jest.fn() }));
jest.mock('../mini/openNotification', () => jest.fn());

const { openCaseById } = require('../../api/all/cases');
const { sellItemByStorageId } = require('../../api/all/storage');
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
    openCaseById.mockResolvedValue({ status: 200, message: 'Недостатньо кредитів на балансі' });
    renderOpenCase();

    fireEvent.click(screen.getByRole('button', { name: /openCase\.openBlocks$/ }));
    fireEvent.click(document.querySelector('.opencase-blocklist .front'));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'Недостатньо кредитів на балансі'));
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

const deferred = () => {
    let settle;
    const promise = new Promise((resolve) => { settle = resolve; });
    return { promise, resolve: settle };
};

const soldAnswer = (balance) => ({ status: 200, balance });

const openTwoAndShowResult = async () => {
    openTwo();
    renderOpenCase(baseCase, {}, cachedGuns);
    fireEvent.click(screen.getByRole('button', { name: /openCase\.fast$/ }));
    await screen.findByText('openCase.sellFor {"price":25}');
};

test('a sell button cannot sell the same item twice while its sale is in flight', async () => {
    const sale = deferred();
    sellItemByStorageId.mockReturnValue(sale.promise);
    await openTwoAndShowResult();

    const sellButton = screen.getByRole('button', { name: /openCase\.sellFor \{"price":25\}/ });
    fireEvent.click(sellButton);
    fireEvent.click(sellButton);

    expect(sellItemByStorageId).toHaveBeenCalledTimes(1);
    expect(sellItemByStorageId).toHaveBeenCalledWith(50);

    await act(async () => { sale.resolve(soldAnswer(925)); });

    expect(screen.getAllByText('inventory.soldLabel')).toHaveLength(1);
    expect(window.HeaderSecond.changeBalance).toHaveBeenLastCalledWith(925);
});

test('sell all cannot run twice at once, and single sells wait for it', async () => {
    const first = deferred();
    const second = deferred();
    sellItemByStorageId.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await openTwoAndShowResult();

    const sellAll = screen.getByRole('button', { name: /openCase\.sellAllFor/ });
    fireEvent.click(sellAll);
    fireEvent.click(sellAll);
    fireEvent.click(screen.getByRole('button', { name: /openCase\.sellFor \{"price":4\}/ }));

    expect(sellItemByStorageId).toHaveBeenCalledTimes(1);

    await act(async () => { first.resolve(soldAnswer(925)); });
    expect(sellItemByStorageId).toHaveBeenCalledTimes(2);
    expect(sellItemByStorageId).toHaveBeenLastCalledWith(51);

    await act(async () => { second.resolve(soldAnswer(929)); });

    expect(screen.getAllByText('inventory.soldLabel')).toHaveLength(2);
    expect(openNotification).toHaveBeenCalledWith('success', 'openCase.allSold');
    expect(openNotification).not.toHaveBeenCalledWith('error', expect.anything(), expect.anything());
});

test('sales that finish after "Try again" do not mark items of the next result as sold', async () => {
    const first = deferred();
    const second = deferred();
    sellItemByStorageId.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await openTwoAndShowResult();

    fireEvent.click(screen.getByRole('button', { name: /openCase\.sellAllFor/ }));
    fireEvent.click(screen.getByRole('button', { name: /openCase\.tryAgain/ }));
    await act(async () => { first.resolve(soldAnswer(925)); });
    await act(async () => { second.resolve(soldAnswer(929)); });

    const items = [wonItem(101, 'default'), wonItem(102, 'painted')];
    openCaseById.mockResolvedValue({
        status: 200,
        balance: 829,
        data: items.map((item, i) => ({ winner: { item, winIndex: 71, storageId: 60 + i }, resultWithItem: [item] })),
    });
    fireEvent.click(screen.getByRole('button', { name: /openCase\.fast$/ }));

    expect(await screen.findByText('openCase.sellFor {"price":10}')).toBeInTheDocument();
    expect(screen.getByText('openCase.sellFor {"price":6}')).toBeInTheDocument();
    expect(screen.getByText('openCase.sellAllFor {"sum":"16.00"}')).toBeInTheDocument();
    expect(screen.queryByText('inventory.soldLabel')).toBeNull();
});

const blockTiles = () => Array.from(document.querySelectorAll('.opencase-blocklist .front'));

test.each([
    ['a click', (tile) => fireEvent.click(tile)],
    ['Enter', (tile) => fireEvent.keyDown(tile, { key: 'Enter' })],
    ['Space', (tile) => fireEvent.keyDown(tile, { key: ' ' })],
])('a case block opened with %s opens that block and charges the balance', async (name, activate) => {
    const item = wonItem(101, 'painted');
    openCaseById.mockResolvedValue({
        status: 200,
        balance: 900,
        data: [{ winner: { item, winIndex: 71, storageId: 5 }, resultWithItem: [item] }],
    });
    renderOpenCase(baseCase, {}, cachedGuns);
    fireEvent.click(screen.getByRole('button', { name: /openCase\.openBlocks$/ }));

    activate(screen.getByRole('button', { name: 'openCase.openBlock {"number":3}' }));

    await waitFor(() => expect(blockTiles()[2].parentElement).toHaveClass('opened'));
    expect(openCaseById).toHaveBeenCalledTimes(1);
    expect(window.HeaderSecond.changeBalance).toHaveBeenCalledWith(900);
    expect(blockTiles()[0].parentElement).not.toHaveClass('opened');
});

test('case blocks are focusable buttons, and Space opens one without scrolling the page', async () => {
    openCaseById.mockResolvedValue({ status: 200, message: 'Недостатньо кредитів на балансі' });
    renderOpenCase();
    fireEvent.click(screen.getByRole('button', { name: /openCase\.openBlocks$/ }));
    const [tile] = blockTiles();

    expect(tile).toHaveAttribute('role', 'button');
    expect(tile).toHaveAttribute('tabindex', '0');
    expect(tile).toHaveAttribute('aria-label', 'openCase.openBlock {"number":1}');
    tile.focus();
    expect(tile).toHaveFocus();

    fireEvent.keyDown(tile, { key: 'Tab' });
    fireEvent.keyDown(tile, { key: 'a' });
    expect(openCaseById).not.toHaveBeenCalled();

    expect(fireEvent.keyDown(tile, { key: ' ' })).toBe(false);
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'Недостатньо кредитів на балансі'));
    expect(openCaseById).toHaveBeenCalledTimes(1);
    openControlsAreBack();
});

const flushPromises = () => act(() => Array.from({ length: 50 })
    .reduce((chain) => chain.then(() => undefined), Promise.resolve()));

const expectOutOfTabOrder = (tile) => {
    expect(tile).not.toHaveAttribute('tabindex');
    expect(tile).not.toHaveAttribute('role');
};

test('revealed block tiles leave the tab order and ignore the keyboard, closed ones stay focusable', async () => {
    jest.useFakeTimers();
    try {
        const item = wonItem(101, 'painted');
        openCaseById.mockResolvedValue({
            status: 200,
            balance: 900,
            data: [{ winner: { item, winIndex: 71, storageId: 5 }, resultWithItem: [item] }],
        });
        renderOpenCase(baseCase, {}, cachedGuns);
        fireEvent.click(screen.getByRole('button', { name: /openCase\.openBlocks$/ }));

        expect(blockTiles()).toHaveLength(22);
        blockTiles().forEach((tile) => {
            expect(tile).toHaveAttribute('tabindex', '0');
            expect(tile).toHaveAttribute('role', 'button');
        });

        const chosen = blockTiles()[2];
        fireEvent.keyDown(chosen, { key: 'Enter' });
        await flushPromises();

        expect(window.HeaderSecond.changeBalance).toHaveBeenCalledWith(900);
        expect(blockTiles()[2]).toBe(chosen);
        expect(blockTiles()[2].parentElement).toHaveClass('opened');
        expect(blockTiles()[0].parentElement).not.toHaveClass('opened');
        expectOutOfTabOrder(blockTiles()[2]);
        expect(blockTiles()[0]).toHaveAttribute('tabindex', '0');
        expect(blockTiles()[0]).toHaveAttribute('role', 'button');

        act(() => { jest.advanceTimersByTime(1000); });

        expect(blockTiles().every((tile) => tile.parentElement.classList.contains('opened'))).toBe(true);
        blockTiles().forEach(expectOutOfTabOrder);
        expect(screen.queryAllByRole('button', { name: /openCase\.openBlock / })).toHaveLength(0);

        fireEvent.keyDown(blockTiles()[0], { key: 'Enter' });
        expect(fireEvent.keyDown(blockTiles()[5], { key: ' ' })).toBe(true);
        fireEvent.click(blockTiles()[7]);
        expect(openCaseById).toHaveBeenCalledTimes(1);

        act(() => { jest.advanceTimersByTime(2000); });

        expect(document.querySelector('.opencase-result')).not.toBeNull();
    } finally {
        jest.useRealTimers();
    }
});

test('a guest sent to sign in from a case is marked to go back to it afterwards', async () => {
    const store = createStore(
        combineReducers({
            user: (state = { login: '' }) => state,
            itemCache: itemCacheReducer,
            modules: (state = {}) => state,
        }),
        applyMiddleware(thunk),
    );
    render(
        <Provider store={store}>
            <MemoryRouter initialEntries={['/case/havoc']}>
                <Switch>
                    <Route
                        path="/login"
                        render={({ location }) => (
                            <div>{`sign-in, go back: ${Boolean(location.state && location.state.goBack)}`}</div>
                        )}
                    />
                    <Route path="/case/:id" render={() => <OpenCase data={baseCase} />} />
                </Switch>
            </MemoryRouter>
        </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /openCase\.authorize/ }));

    expect(await screen.findByText('sign-in, go back: true')).toBeInTheDocument();
});

test('each won item wears its grade colour and names its grade beside the wear', async () => {
    const items = [{ ...wonItem(101, 'painted'), grade: 'covert' }, { ...wonItem(102, 'default'), grade: 'special' }];
    openCaseById.mockResolvedValue({
        status: 200,
        balance: 900,
        data: items.map((item, i) => ({ winner: { item, winIndex: 71, storageId: 50 + i }, resultWithItem: [item] })),
    });
    renderOpenCase(baseCase, {}, cachedGuns);

    fireEvent.click(screen.getByRole('button', { name: /openCase\.fast$/ }));

    await screen.findByText('openCase.sellFor {"price":25}');
    const cards = [...document.querySelectorAll('.opencase-result__item')];
    expect(cards.map((card) => card.style.getPropertyValue('--rarity'))).toEqual(['#eb4b4b', '#f7c948']);
    expect(cards[0].textContent).toContain('grade.covert · Field-Tested rifles');
    expect(cards[1].textContent).toContain('grade.special · Field-Tested rifles');
});

test('every tile of the roulette wears its grade colour', async () => {
    const strip = [{ ...wonItem(101, 'default'), grade: 'milspec' }, { ...wonItem(102, 'default'), grade: 'classified' }];
    openCaseById.mockResolvedValue({
        status: 200,
        balance: 900,
        data: [{ winner: { item: strip[1], winIndex: 2, storageId: 60 }, resultWithItem: strip }],
    });
    renderOpenCase(baseCase, {}, cachedGuns);

    fireEvent.click(screen.getByRole('button', { name: /openCase\.open$/ }));

    await waitFor(() => expect(document.querySelectorAll('.opencase-block .casepage-itemlist_item')).toHaveLength(2));
    const tiles = [...document.querySelectorAll('.opencase-block .casepage-itemlist_item')];
    expect(tiles.map((tile) => tile.style.getPropertyValue('--rarity'))).toEqual(['#4b69ff', '#d32ce6']);
});

test('the banner over the roulette names the winner\'s grade beside the wear', async () => {
    const strip = [{ ...wonItem(101, 'default'), grade: 'milspec' }, { ...wonItem(102, 'default'), grade: 'classified' }];
    openCaseById.mockResolvedValue({
        status: 200,
        balance: 900,
        data: [{ winner: { item: strip[1], winIndex: 2, storageId: 60 }, resultWithItem: strip }],
    });
    renderOpenCase(baseCase, {}, cachedGuns);

    fireEvent.click(screen.getByRole('button', { name: /openCase\.open$/ }));

    await waitFor(() => expect(document.querySelector('.opencase-titleitem span')).not.toBeNull());
    expect(document.querySelector('.opencase-titleitem span').textContent).toBe('grade.classified · Field-Tested rifles');
});

test('a won item the server refuses to sell says why, on its own and in "sell all"', async () => {
    sellItemByStorageId.mockRejectedValue({ error: 422, message: 'balance is full' });
    await openTwoAndShowResult();

    fireEvent.click(screen.getByRole('button', { name: /openCase\.sellFor \{"price":25\}/ }));
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'openCase.sellErrorTitle', 'balance is full'));

    openNotification.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /openCase\.sellAllFor/ }));
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'openCase.sellErrorTitle', 'balance is full'));
});

test('sell all names a refusal and still reports a sale that failed without a reason', async () => {
    sellItemByStorageId.mockReset();
    sellItemByStorageId
        .mockRejectedValueOnce({ error: 422, message: 'balance is full' })
        .mockRejectedValueOnce({ error: 502 });
    await openTwoAndShowResult();

    fireEvent.click(screen.getByRole('button', { name: /openCase\.sellAllFor/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'openCase.sellErrorTitle', 'balance is full. openCase.sellErrorText.',
    ));
});
