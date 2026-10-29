import React from 'react';
import {
    act, render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { MemoryRouter } from 'react-router-dom';
import Case from './Case';

jest.mock('react-i18next', () => {
    const mockReact = require('react');
    const t = (key) => key;
    return {
        useTranslation: () => ({ t }),
        withTranslation: () => (Component) => (props) => mockReact.createElement(Component, { ...props, t }),
    };
});

jest.mock('react-reveal/Fade', () => ({ __esModule: true, default: ({ children }) => children }));

jest.mock('../api/all/cases', () => ({ getCaseById: jest.fn() }));
jest.mock('../api/all/provablyFair', () => ({ getProvablyFairState: jest.fn() }));
jest.mock('../store/actions/itemCache', () => ({ itemInfoFetch: jest.fn() }));
jest.mock('../components/modules/OpenCase', () => ({ onCaseChanged }) => (
    <button type="button" onClick={onCaseChanged}>opened</button>
));

const { getCaseById } = require('../api/all/cases');
const { getProvablyFairState } = require('../api/all/provablyFair');
const { itemInfoFetch } = require('../store/actions/itemCache');

beforeEach(() => {
    itemInfoFetch.mockImplementation(() => ({ type: 'noop' }));
});

const caseResponse = (openedCount) => ({
    data: { case_id: 'havoc', case_title: 'Havoc', case_openedCount: openedCount },
    caseCollection: { ITEMS: [] },
});

test('the opened count is refreshed after an open', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    getCaseById.mockResolvedValueOnce(caseResponse(7)).mockResolvedValueOnce(caseResponse(8));
    const store = createStore(() => ({ itemCache: {} }));

    const { container } = render(
        <Provider store={store}>
            <MemoryRouter>
                <Case match={{ params: { id: 'havoc' } }} history={{ push: jest.fn(), replace: jest.fn() }} />
            </MemoryRouter>
        </Provider>,
    );

    const openedCount = () => container.querySelector('.casepage-title-second i').textContent;
    await waitFor(() => expect(openedCount()).toBe('case.openedCount 7'));

    fireEvent.click(screen.getByRole('button', { name: 'opened' }));

    await waitFor(() => expect(openedCount()).toBe('case.openedCount 8'));
    expect(getCaseById).toHaveBeenLastCalledWith('havoc');
});

const deferred = () => {
    const handle = {};
    handle.promise = new Promise((resolve, reject) => {
        handle.resolve = resolve;
        handle.reject = reject;
    });
    return handle;
};

const settle = () => act(async () => {
    await new Promise((resolve) => { setTimeout(resolve, 50); });
});

const casePage = (store, id, history) => (
    <Provider store={store}>
        <MemoryRouter>
            <Case match={{ params: { id } }} history={history} />
        </MemoryRouter>
    </Provider>
);

test('a late answer for the previous case does not replace the case now shown', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    const havoc = deferred();
    getCaseById.mockImplementation((id) => (id === 'havoc' ? havoc.promise : Promise.resolve({
        data: { case_id: 'phoenix', case_title: 'Phoenix', case_openedCount: 3 },
        caseCollection: { ITEMS: [] },
    })));
    const store = createStore(() => ({ itemCache: {} }));
    const history = { push: jest.fn(), replace: jest.fn() };

    const { container, rerender } = render(casePage(store, 'havoc', history));
    rerender(casePage(store, 'phoenix', history));

    const openedCount = () => container.querySelector('.casepage-title-second i')?.textContent;
    await waitFor(() => expect(openedCount()).toBe('case.openedCount 3'));

    havoc.resolve(caseResponse(7));
    await settle();

    expect(openedCount()).toBe('case.openedCount 3');
    expect(history.push).not.toHaveBeenCalled();
    expect(history.replace).not.toHaveBeenCalled();
});

test('a late failure for the previous case does not send the player to not-found', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    const havoc = deferred();
    getCaseById.mockImplementation((id) => (id === 'havoc' ? havoc.promise : Promise.resolve({
        data: { case_id: 'phoenix', case_title: 'Phoenix', case_openedCount: 3 },
        caseCollection: { ITEMS: [] },
    })));
    const store = createStore(() => ({ itemCache: {} }));
    const history = { push: jest.fn(), replace: jest.fn() };

    const { container, rerender } = render(casePage(store, 'havoc', history));
    rerender(casePage(store, 'phoenix', history));

    const openedCount = () => container.querySelector('.casepage-title-second i')?.textContent;
    await waitFor(() => expect(openedCount()).toBe('case.openedCount 3'));

    havoc.reject({ error: 404 });
    await settle();

    expect(history.push).not.toHaveBeenCalled();
    expect(history.replace).not.toHaveBeenCalled();
    expect(openedCount()).toBe('case.openedCount 3');
});

test('a failure that arrives after the player left the case page does not navigate', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    const havoc = deferred();
    getCaseById.mockReturnValue(havoc.promise);
    const store = createStore(() => ({ itemCache: {} }));
    const history = { push: jest.fn(), replace: jest.fn() };

    const { unmount } = render(casePage(store, 'havoc', history));
    unmount();

    havoc.reject({ error: 500 });
    await settle();

    expect(history.push).not.toHaveBeenCalled();
    expect(history.replace).not.toHaveBeenCalled();
});

const updatesAfterClosing = async (unmount, answer) => {
    unmount();
    const setState = jest.spyOn(React.Component.prototype, 'setState');
    const consoleError = jest.spyOn(console, 'error');
    await act(async () => {
        answer();
        await new Promise((resolve) => { setTimeout(resolve, 50); });
    });
    const result = {
        setStates: setState.mock.calls.length,
        warnings: consoleError.mock.calls.filter(([message]) => String(message).includes('unmounted component')),
    };
    setState.mockRestore();
    consoleError.mockRestore();
    return result;
};

test('the provably fair badge shows the active seed hash', async () => {
    getProvablyFairState.mockResolvedValue({ data: { active: { serverSeedHash: 'hash' } } });
    getCaseById.mockResolvedValue(caseResponse(7));
    const store = createStore(() => ({ itemCache: {} }));

    render(casePage(store, 'havoc', { push: jest.fn() }));

    expect(await screen.findByText('provablyFair.badge')).toBeInTheDocument();
});

test('a seed answer that arrives after the page closed updates nothing', async () => {
    const seed = deferred();
    getProvablyFairState.mockReturnValue(seed.promise);
    getCaseById.mockResolvedValue(caseResponse(7));
    const store = createStore(() => ({ itemCache: {} }));

    const { unmount } = render(casePage(store, 'havoc', { push: jest.fn() }));
    await waitFor(() => expect(getProvablyFairState).toHaveBeenCalled());

    const { setStates, warnings } = await updatesAfterClosing(unmount, () => {
        seed.resolve({ data: { active: { serverSeedHash: 'hash' } } });
    });

    expect(setStates).toBe(0);
    expect(warnings).toEqual([]);
});

test('the seed is not asked for once the page closed before the case arrived', async () => {
    const havoc = deferred();
    getCaseById.mockReturnValue(havoc.promise);
    getProvablyFairState.mockResolvedValue({ data: { active: { serverSeedHash: 'hash' } } });
    const store = createStore(() => ({ itemCache: {} }));

    const { unmount } = render(casePage(store, 'havoc', { push: jest.fn() }));

    const { setStates, warnings } = await updatesAfterClosing(unmount, () => havoc.resolve(caseResponse(7)));

    expect(getProvablyFairState).not.toHaveBeenCalled();
    expect(setStates).toBe(0);
    expect(warnings).toEqual([]);
});

test('a refresh that answers after the page closed updates nothing', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    const refresh = deferred();
    getCaseById.mockResolvedValueOnce(caseResponse(7)).mockReturnValueOnce(refresh.promise);
    const store = createStore(() => ({ itemCache: {} }));

    const { container, unmount } = render(casePage(store, 'havoc', { push: jest.fn() }));
    await waitFor(() => expect(container.querySelector('.casepage-title-second i').textContent).toBe('case.openedCount 7'));
    fireEvent.click(screen.getByRole('button', { name: 'opened' }));
    expect(getCaseById).toHaveBeenCalledTimes(2);

    const { setStates, warnings } = await updatesAfterClosing(unmount, () => refresh.resolve(caseResponse(8)));

    expect(setStates).toBe(0);
    expect(warnings).toEqual([]);
});

test('every item of the case is looked up, cached or not, so a failed lookup is asked for again', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    getCaseById.mockResolvedValue({ ...caseResponse(7), caseCollection: { ITEMS: [{ id: 1 }, { id: 2 }] } });
    const store = createStore(() => ({ itemCache: { 1: { item_itemId: 1, item_name: 'Item 1', placeholder: 'failed' } } }));

    render(
        <Provider store={store}>
            <MemoryRouter>
                <Case match={{ params: { id: 'havoc' } }} history={{ push: jest.fn(), replace: jest.fn() }} />
            </MemoryRouter>
        </Provider>,
    );

    await waitFor(() => expect(itemInfoFetch).toHaveBeenCalledTimes(2));
    expect(itemInfoFetch.mock.calls.map(([id]) => id)).toEqual([1, 2]);
});

test('a case the server does not know sends the player to not-found', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    getCaseById.mockRejectedValue({ error: 400, message: 'Кейс не існує' });
    const history = { push: jest.fn(), replace: jest.fn() };

    render(casePage(createStore(() => ({ itemCache: {} })), 'nope', history));

    await waitFor(() => expect(history.replace).toHaveBeenCalledWith('/404'));
    expect(history.push).not.toHaveBeenCalled();
    expect(screen.queryByText('common.loadFailed')).toBeNull();
});

test.each([
    ['network', new TypeError('Failed to fetch')],
    ['server', { error: 500 }],
])('a %s failure says the case could not be loaded instead of not-found, and a retry loads it', async (_, failure) => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    getCaseById.mockReset();
    getCaseById.mockRejectedValueOnce(failure).mockResolvedValueOnce(caseResponse(7));
    const history = { push: jest.fn(), replace: jest.fn() };

    const { container } = render(casePage(createStore(() => ({ itemCache: {} })), 'havoc', history));

    expect(await screen.findByText('common.loadFailed')).toBeInTheDocument();
    expect(history.push).not.toHaveBeenCalled();
    expect(history.replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /common\.retry/ }));

    await waitFor(() => expect(container.querySelector('.casepage-title-second i')?.textContent).toBe('case.openedCount 7'));
    expect(screen.queryByText('common.loadFailed')).toBeNull();
});

test('the contents run from the rarest grade down, the dearer item first within a grade, each tile in its grade colour', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    const item = (id, grade, price) => ({
        item_itemId: id, item_name: `Item ${id}`, item_type: 'rifles', item_rare: 'Field Tested', item_grade: grade, pricesInCredits: { default: price },
    });
    getCaseById.mockResolvedValue({ ...caseResponse(0), caseCollection: { ITEMS: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] } });
    const store = createStore(() => ({
        itemCache: {
            1: item(1, 'milspec', 900), 2: item(2, 'special', 3000), 3: item(3, 'covert', 400), 4: item(4, 'covert', 700),
        },
    }));

    render(casePage(store, 'havoc', { push: jest.fn(), replace: jest.fn() }));

    await waitFor(() => expect(document.querySelectorAll('.casepage-itemlist_item')).toHaveLength(4));
    const tiles = [...document.querySelectorAll('.casepage-itemlist_item')];
    expect(tiles.map((tile) => tile.querySelector('.casepage-itemlist_item__name').textContent))
        .toEqual(['Item 2', 'Item 4', 'Item 3', 'Item 1']);
    expect(tiles.map((tile) => tile.style.getPropertyValue('--rarity')))
        .toEqual(['#f7c948', '#eb4b4b', '#eb4b4b', '#4b69ff']);
});

test('pointing at an item of the contents names its grade and wear', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    getCaseById.mockResolvedValue({ ...caseResponse(0), caseCollection: { ITEMS: [{ id: 1 }] } });
    const store = createStore(() => ({
        itemCache: {
            1: {
                item_itemId: 1, item_name: 'AK-47 | Redline', item_type: 'rifles', item_rare: 'Field Tested', item_grade: 'classified', pricesInCredits: { default: 900 },
            },
        },
    }));

    render(casePage(store, 'havoc', { push: jest.fn(), replace: jest.fn() }));

    fireEvent.mouseEnter((await screen.findByText('AK-47 | Redline')).closest('a'));

    expect(await screen.findByRole('tooltip'))
        .toHaveTextContent('item.name: AK-47 | Redline, item.type: rifles, item.rarity: grade.classified, item.wear: Field Tested');
});

test('the grade of an item of the contents reaches keyboard and screen-reader users too', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    getCaseById.mockResolvedValue({ ...caseResponse(0), caseCollection: { ITEMS: [{ id: 1 }] } });
    const store = createStore(() => ({
        itemCache: {
            1: {
                item_itemId: 1, item_name: 'AK-47 | Redline', item_type: 'rifles', item_rare: 'Field Tested', item_grade: 'classified', pricesInCredits: { default: 900 },
            },
        },
    }));

    render(casePage(store, 'havoc', { push: jest.fn(), replace: jest.fn() }));

    const tile = await screen.findByRole('link', { name: 'AK-47 | Redline, 900 ₴, grade.classified' });
    fireEvent.focus(tile);

    expect(await screen.findByRole('tooltip')).toHaveTextContent('item.rarity: grade.classified');
});

test('each item of the contents shows its chance, also in its tooltip and its accessible name', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    getCaseById.mockResolvedValue({ ...caseResponse(0), caseCollection: { ITEMS: [{ id: 1 }] }, odds: { 1: 0.0917 } });
    const store = createStore(() => ({
        itemCache: {
            1: {
                item_itemId: 1, item_name: 'AK-47 | Redline', item_type: 'rifles', item_rare: 'Field Tested', item_grade: 'classified', pricesInCredits: { default: 900 },
            },
        },
    }));

    render(casePage(store, 'havoc', { push: jest.fn(), replace: jest.fn() }));

    const tile = await screen.findByRole('link', { name: 'AK-47 | Redline, 900 ₴, grade.classified, item.chance 9,17%' });
    expect(tile.querySelector('.casepage-itemlist_item__chance').textContent).toBe('9,17%');
    fireEvent.mouseEnter(tile);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('item.wear: Field Tested, item.chance: 9,17%');
});

test('above the contents the chances add up by grade, the rarest grade first', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    const item = (id, grade) => ({
        item_itemId: id, item_name: `Item ${id}`, item_type: 'rifles', item_rare: 'Field Tested', item_grade: grade, pricesInCredits: { default: 10 },
    });
    getCaseById.mockResolvedValue({
        ...caseResponse(0),
        caseCollection: { ITEMS: [{ id: 1 }, { id: 2 }, { id: 3 }] },
        odds: { 1: 0.5, 2: 0.3, 3: 0.2 },
    });
    const store = createStore(() => ({ itemCache: { 1: item(1, 'milspec'), 2: item(2, 'milspec'), 3: item(3, 'covert') } }));

    render(casePage(store, 'havoc', { push: jest.fn(), replace: jest.fn() }));

    const summary = await screen.findByRole('list', { name: 'case.oddsByGrade' });
    expect([...summary.querySelectorAll('li')].map((li) => [li.textContent, li.style.getPropertyValue('--rarity')]))
        .toEqual([['grade.covert 20%', '#eb4b4b'], ['grade.milspec 80%', '#4b69ff']]);
});

test('without odds there is no summary by grade', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    getCaseById.mockResolvedValue({ ...caseResponse(0), caseCollection: { ITEMS: [{ id: 1 }] } });
    const store = createStore(() => ({
        itemCache: {
            1: {
                item_itemId: 1, item_name: 'Item 1', item_grade: 'covert', pricesInCredits: { default: 10 },
            },
        },
    }));

    render(casePage(store, 'havoc', { push: jest.fn(), replace: jest.fn() }));

    await screen.findByText('Item 1');
    expect(screen.queryByRole('list', { name: 'case.oddsByGrade' })).toBeNull();
    expect(document.querySelector('.casepage-itemlist_item__chance')).toBeNull();
});

test('on the English site the chances are written the English way', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    getCaseById.mockResolvedValue({ ...caseResponse(0), caseCollection: { ITEMS: [{ id: 1 }] }, odds: { 1: 0.0917 } });
    const store = createStore(() => ({
        itemCache: {
            1: {
                item_itemId: 1, item_name: 'AK-47 | Redline', item_grade: 'classified', pricesInCredits: { default: 900 },
            },
        },
    }));

    render(
        <Provider store={store}>
            <MemoryRouter>
                <Case match={{ params: { id: 'havoc' } }} history={{ push: jest.fn(), replace: jest.fn() }} i18n={{ language: 'en' }} />
            </MemoryRouter>
        </Provider>,
    );

    expect(await screen.findByText('9.17%', { selector: '.casepage-itemlist_item__chance' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'case.oddsByGrade' })).toHaveTextContent('grade.classified 9.17%');
});

test('a guest sees the provably fair badge too, as a link to the checking page without a seed hash', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    getCaseById.mockResolvedValue(caseResponse(7));
    const store = createStore(() => ({ itemCache: {} }));

    render(casePage(store, 'havoc', { push: jest.fn(), replace: jest.fn() }));

    const badge = await screen.findByRole('link', { name: 'provablyFair.badge' });
    expect(badge).toHaveAttribute('href', '/provably-fair');
    fireEvent.mouseEnter(badge);
    await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 200); }); });
    expect(screen.queryByRole('tooltip')).toBeNull();
});
