import React from 'react';
import {
    render, screen, fireEvent, waitFor, act,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import usersReducer from '../store/reducers/user';
import itemCacheReducer from '../store/reducers/itemCache';
import moduleReducer from '../store/reducers/module';
import { LOGIN_USER } from '../store/types';
import Inventory from './Inventory';

jest.mock('react-i18next', () => ({
    withTranslation: () => (Component) => (props) => (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Component {...props} t={(key, options) => (options ? `${key} ${JSON.stringify(options)}` : key)} />
    ),
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../api/all/ws', () => ({ __esModule: true, default: {}, reconnectSocket: jest.fn() }));
jest.mock('../components/mini/openNotification', () => jest.fn());
jest.mock('../api/all/item', () => ({ getItemsInfo: jest.fn() }));
jest.mock('../api/all/storage', () => ({
    getProfileStorage: jest.fn(),
    sellItemByStorageId: jest.fn(),
    receiveItemByStorageId: jest.fn(),
    cancelWithdrawalByStorageId: jest.fn(),
}));

const openNotification = require('../components/mini/openNotification');
const {
    getProfileStorage, receiveItemByStorageId, cancelWithdrawalByStorageId, sellItemByStorageId,
} = require('../api/all/storage');

const sellItemByStorageIdMock = () => sellItemByStorageId;
const { getItemsInfo } = require('../api/all/item');

const server = { rows: [], clockAhead: 0 };
const serverNow = () => new Date(Date.now() + server.clockAhead).toISOString();
const row = (id, status, updatedAt = null) => ({
    storage_id: id, storage_itemId: 1, storage_color: 'default', storage_status: status, updated_at: updatedAt,
});

beforeEach(() => {
    server.clockAhead = 0;
    openNotification.mockReset();
    getItemsInfo.mockImplementation((ids) => Promise.resolve({ data: Object.fromEntries(ids.map((id) => [id, { item_name: `Item ${id}` }])) }));
    getProfileStorage.mockImplementation(({ status }) => Promise.resolve({
        status: 200, data: server.rows.filter((r) => r.storage_status === status), serverNow: serverNow(),
    }));
    receiveItemByStorageId.mockImplementation((id) => {
        const target = server.rows.find((r) => r.storage_id === id);
        target.storage_status = 'waitingtrade';
        target.updated_at = new Date().toISOString();
        return Promise.resolve({ status: 200, completesAt: new Date(Date.now() + 60000).toISOString() });
    });
    cancelWithdrawalByStorageId.mockImplementation((id) => {
        const target = server.rows.find((r) => r.storage_id === id);
        target.storage_status = 'inventory';
        return Promise.resolve({ status: 200 });
    });
});

const renderInventory = (receiveInfo = 'steam:abc', history = { push: jest.fn() }) => {
    const store = createStore(
        combineReducers({ user: usersReducer, itemCache: itemCacheReducer, modules: moduleReducer }),
        applyMiddleware(thunk),
    );
    store.dispatch({
        type: LOGIN_USER,
        payloadUser: {
            user_id: 7, user_login: 'player', user_balance: '0.00', user_receiveInfo: receiveInfo,
        },
    });
    return render(
        <Provider store={store}>
            <Inventory history={history} />
        </Provider>,
    );
};

const openWithdrawTab = async () => {
    fireEvent.click(await screen.findByRole('tab', { name: 'inventory.withdrawTab' }));
};

test('withdrawing an item moves it to the withdrawal tab with a countdown and a cancel button', async () => {
    server.rows = [row(1, 'inventory')];
    renderInventory();

    fireEvent.click(await screen.findByRole('button', { name: /inventory\.withdraw$/ }));

    await waitFor(() => expect(receiveItemByStorageId).toHaveBeenCalledWith(1));
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('success', 'inventory.withdrawRequested'));
    expect(screen.queryByRole('button', { name: /inventory\.withdraw$/ })).not.toBeInTheDocument();
    await openWithdrawTab();
    expect(await screen.findByText(/inventory\.withdrawCountdown/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /inventory\.withdrawCancel/ })).toBeInTheDocument();
});

test('without receive info no request is sent and the player is told what to fill in', async () => {
    server.rows = [row(1, 'inventory')];
    renderInventory('');

    fireEvent.click(await screen.findByRole('button', { name: /inventory\.withdraw$/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'inventory.withdrawErrorTitle', expect.anything(),
    ));
    expect(receiveItemByStorageId).not.toHaveBeenCalled();
});

test('a refused withdrawal shows the server reason and keeps the item', async () => {
    server.rows = [row(1, 'inventory')];
    receiveItemByStorageId.mockRejectedValue({ error: 422, message: 'Такого предмету не існує' });
    renderInventory();

    fireEvent.click(await screen.findByRole('button', { name: /inventory\.withdraw$/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'inventory.withdrawErrorTitle', 'Такого предмету не існує',
    ));
    expect(screen.getByRole('button', { name: /inventory\.withdraw$/ })).toBeInTheDocument();
});

test('an unexpected failure shows the generic error, not raw text', async () => {
    server.rows = [row(1, 'inventory')];
    receiveItemByStorageId.mockRejectedValue(new TypeError('Failed to fetch'));
    renderInventory();

    fireEvent.click(await screen.findByRole('button', { name: /inventory\.withdraw$/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'inventory.withdrawErrorTitle', 'common.serverError',
    ));
});

test('cancelling a pending withdrawal puts the item back among the active ones', async () => {
    server.rows = [row(1, 'waitingtrade', new Date().toISOString())];
    renderInventory();

    await openWithdrawTab();
    fireEvent.click(await screen.findByRole('button', { name: /inventory\.withdrawCancel/ }));

    await waitFor(() => expect(cancelWithdrawalByStorageId).toHaveBeenCalledWith(1));
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('success', 'inventory.withdrawCancelled'));
    fireEvent.click(screen.getByRole('tab', { name: 'inventory.active' }));
    expect(await screen.findByRole('button', { name: /inventory\.withdraw$/ })).toBeInTheDocument();
});

test('withdrawn items are listed as done', async () => {
    server.rows = [row(1, 'received', new Date().toISOString())];
    renderInventory();

    await openWithdrawTab();

    expect(await screen.findByText('inventory.withdrawDone')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /inventory\.withdrawCancel/ })).not.toBeInTheDocument();
});

const pollTimer = (setIntervalSpy) => {
    const index = setIntervalSpy.mock.calls.findIndex(([, ms]) => ms === 10000);
    return index === -1 ? null : { tick: setIntervalSpy.mock.calls[index][0], id: setIntervalSpy.mock.results[index].value };
};

test('the withdrawal tab polls while a request is pending and stops once nothing is pending', async () => {
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    server.rows = [row(1, 'waitingtrade', new Date().toISOString())];
    renderInventory();
    await screen.findByRole('tab', { name: 'inventory.withdrawTab' });

    const poll = pollTimer(setIntervalSpy);
    expect(poll).not.toBeNull();
    const callsBefore = getProfileStorage.mock.calls.length;

    server.rows[0].storage_status = 'received';
    await act(async () => { poll.tick(); });

    await waitFor(() => expect(getProfileStorage.mock.calls.length).toBe(callsBefore + 2));
    await waitFor(() => expect(clearIntervalSpy).toHaveBeenCalledWith(poll.id));
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
});

test('nothing polls when no request is pending', async () => {
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    server.rows = [row(1, 'inventory'), row(2, 'received', new Date().toISOString())];
    renderInventory();
    await screen.findByRole('tab', { name: 'inventory.withdrawTab' });

    expect(pollTimer(setIntervalSpy)).toBeNull();
    setIntervalSpy.mockRestore();
});

test('polling stops when the page is left while a request is still pending', async () => {
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    server.rows = [row(1, 'waitingtrade', new Date().toISOString())];
    const { unmount } = renderInventory();
    await screen.findByRole('tab', { name: 'inventory.withdrawTab' });
    const poll = pollTimer(setIntervalSpy);
    expect(poll).not.toBeNull();

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(poll.id);
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
});

const deferred = () => {
    let settle;
    const promise = new Promise((resolve) => { settle = resolve; });
    return { promise, resolve: settle };
};

test('a poll that answers after a cancel does not bring the cancelled item back to the pending list', async () => {
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    server.rows = [row(1, 'waitingtrade', new Date().toISOString()), row(2, 'waitingtrade', new Date().toISOString())];
    renderInventory();
    await openWithdrawTab();
    const poll = pollTimer(setIntervalSpy);

    const stale = deferred();
    const answer = getProfileStorage.getMockImplementation();
    getProfileStorage.mockImplementation((request) => (request.status === 'waitingtrade' ? stale.promise : answer(request)));
    await act(async () => { poll.tick(); });

    const [firstCancel] = await screen.findAllByRole('button', { name: /inventory\.withdrawCancel/ });
    fireEvent.click(firstCancel);
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('success', 'inventory.withdrawCancelled'));

    await act(async () => {
        stale.resolve({
            status: 200,
            data: [row(1, 'waitingtrade', new Date().toISOString()), row(2, 'waitingtrade', new Date().toISOString())],
        });
    });

    expect(screen.getAllByRole('button', { name: /inventory\.withdrawCancel/ })).toHaveLength(1);
    setIntervalSpy.mockRestore();
});

test('while a withdrawal request is in flight every item action is disabled', async () => {
    server.rows = [row(1, 'inventory'), row(2, 'inventory')];
    const inFlight = deferred();
    receiveItemByStorageId.mockImplementation(() => inFlight.promise);
    renderInventory();

    const [firstWithdraw] = await screen.findAllByRole('button', { name: /inventory\.withdraw$/ });
    fireEvent.click(firstWithdraw);

    await waitFor(() => {
        screen.getAllByRole('button', { name: /inventory\.withdraw$/ }).forEach((b) => expect(b).toBeDisabled());
    });
    screen.getAllByRole('button', { name: /openCase\.sellFor|inventory\.sell$/ }).forEach((b) => expect(b).toBeDisabled());
    expect(screen.getByRole('button', { name: /inventory\.sellAll/ })).toBeDisabled();

    await act(async () => { inFlight.resolve({ status: 200, completesAt: new Date(Date.now() + 60000).toISOString() }); });
    await waitFor(() => expect(screen.getByRole('button', { name: /inventory\.withdraw$/ })).not.toBeDisabled());
});

test('a pending withdrawal cannot be cancelled while sell all is running', async () => {
    server.rows = [row(1, 'inventory'), row(2, 'waitingtrade', new Date().toISOString())];
    const sale = deferred();
    sellItemByStorageIdMock().mockImplementation(() => sale.promise);
    renderInventory();

    fireEvent.click(await screen.findByRole('button', { name: /inventory\.sellAll/ }));
    await openWithdrawTab();

    expect(await screen.findByRole('button', { name: /inventory\.withdrawCancel/ })).toBeDisabled();
    await act(async () => { sale.resolve({ status: 200, balance: '10.00' }); });
});

test('the hint about missing receive info opens the settings inside the app', async () => {
    const history = { push: jest.fn() };
    server.rows = [row(1, 'inventory')];
    renderInventory('', history);

    fireEvent.click(await screen.findByRole('button', { name: /inventory\.withdraw$/ }));
    await waitFor(() => expect(openNotification).toHaveBeenCalled());
    const hint = openNotification.mock.calls[0][2];

    render(hint);
    fireEvent.click(screen.getByText('inventory.withdrawNeedsInfo'));
    expect(history.push).toHaveBeenCalledWith('/settings');
});

const shownSeconds = async () => {
    const text = (await screen.findByText(/inventory\.withdrawCountdown/)).textContent;
    return JSON.parse(text.slice(text.indexOf('{'))).seconds;
};

test('the countdown of a new request follows the server clock, not the browser clock', async () => {
    server.clockAhead = 5 * 60 * 1000;
    server.rows = [row(1, 'inventory')];
    receiveItemByStorageId.mockImplementation(() => Promise.resolve({
        status: 200,
        completesAt: new Date(Date.now() + server.clockAhead + 70000).toISOString(),
        serverNow: serverNow(),
    }));
    renderInventory();

    fireEvent.click(await screen.findByRole('button', { name: /inventory\.withdraw$/ }));
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('success', 'inventory.withdrawRequested'));
    await openWithdrawTab();

    const seconds = await shownSeconds();
    expect(seconds).toBeGreaterThanOrEqual(65);
    expect(seconds).toBeLessThanOrEqual(70);
});

test('the countdown of a listed request counts to the latest sweep on the server clock', async () => {
    server.clockAhead = 5 * 60 * 1000;
    server.rows = [row(1, 'waitingtrade', new Date(Date.now() + server.clockAhead - 10000).toISOString())];
    const answer = getProfileStorage.getMockImplementation();
    getProfileStorage.mockImplementation((request) => new Promise((resolve) => {
        setTimeout(() => resolve(answer(request)), request.status === 'waitingtrade' ? 1500 : 0);
    }));
    renderInventory();

    fireEvent.click(await screen.findByRole('tab', { name: 'inventory.withdrawTab' }, { timeout: 5000 }));

    const seconds = await shownSeconds();
    expect(seconds).toBeGreaterThanOrEqual(55);
    expect(seconds).toBeLessThanOrEqual(59);
});

test('a poll that already sees a new request does not make it appear twice', async () => {
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    server.rows = [row(1, 'inventory'), row(2, 'waitingtrade', new Date().toISOString())];
    const withdrawal = deferred();
    receiveItemByStorageId.mockImplementation((id) => {
        const target = server.rows.find((r) => r.storage_id === id);
        target.storage_status = 'waitingtrade';
        target.updated_at = new Date().toISOString();
        return withdrawal.promise;
    });
    renderInventory();
    await screen.findByRole('tab', { name: 'inventory.withdrawTab' });
    const poll = pollTimer(setIntervalSpy);

    fireEvent.click(await screen.findByRole('button', { name: /inventory\.withdraw$/ }));
    await waitFor(() => expect(receiveItemByStorageId).toHaveBeenCalledWith(1));
    await act(async () => { poll.tick(); });
    await act(async () => {
        withdrawal.resolve({ status: 200, completesAt: new Date(Date.now() + 70000).toISOString(), serverNow: serverNow() });
    });

    await openWithdrawTab();
    await waitFor(() => expect(screen.getAllByRole('button', { name: /inventory\.withdrawCancel/ })).toHaveLength(2));
    setIntervalSpy.mockRestore();
});
