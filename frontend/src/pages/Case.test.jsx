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
                <Case match={{ params: { id: 'havoc' } }} history={{ push: jest.fn() }} />
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
    const history = { push: jest.fn() };

    const { container, rerender } = render(casePage(store, 'havoc', history));
    rerender(casePage(store, 'phoenix', history));

    const openedCount = () => container.querySelector('.casepage-title-second i')?.textContent;
    await waitFor(() => expect(openedCount()).toBe('case.openedCount 3'));

    havoc.resolve(caseResponse(7));
    await settle();

    expect(openedCount()).toBe('case.openedCount 3');
    expect(history.push).not.toHaveBeenCalled();
});

test('a late failure for the previous case does not send the player to not-found', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    const havoc = deferred();
    getCaseById.mockImplementation((id) => (id === 'havoc' ? havoc.promise : Promise.resolve({
        data: { case_id: 'phoenix', case_title: 'Phoenix', case_openedCount: 3 },
        caseCollection: { ITEMS: [] },
    })));
    const store = createStore(() => ({ itemCache: {} }));
    const history = { push: jest.fn() };

    const { container, rerender } = render(casePage(store, 'havoc', history));
    rerender(casePage(store, 'phoenix', history));

    const openedCount = () => container.querySelector('.casepage-title-second i')?.textContent;
    await waitFor(() => expect(openedCount()).toBe('case.openedCount 3'));

    havoc.reject({ error: 404 });
    await settle();

    expect(history.push).not.toHaveBeenCalled();
    expect(openedCount()).toBe('case.openedCount 3');
});

test('a failure that arrives after the player left the case page does not navigate', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    const havoc = deferred();
    getCaseById.mockReturnValue(havoc.promise);
    const store = createStore(() => ({ itemCache: {} }));
    const history = { push: jest.fn() };

    const { unmount } = render(casePage(store, 'havoc', history));
    unmount();

    havoc.reject({ error: 500 });
    await settle();

    expect(history.push).not.toHaveBeenCalled();
});

test('every item of the case is looked up, cached or not, so a failed lookup is asked for again', async () => {
    getProvablyFairState.mockRejectedValue({ error: 401 });
    getCaseById.mockResolvedValue({ ...caseResponse(7), caseCollection: { ITEMS: [{ id: 1 }, { id: 2 }] } });
    const store = createStore(() => ({ itemCache: { 1: { item_itemId: 1, item_name: 'Item 1', placeholder: 'failed' } } }));

    render(
        <Provider store={store}>
            <MemoryRouter>
                <Case match={{ params: { id: 'havoc' } }} history={{ push: jest.fn() }} />
            </MemoryRouter>
        </Provider>,
    );

    await waitFor(() => expect(itemInfoFetch).toHaveBeenCalledTimes(2));
    expect(itemInfoFetch.mock.calls.map(([id]) => id)).toEqual([1, 2]);
});
