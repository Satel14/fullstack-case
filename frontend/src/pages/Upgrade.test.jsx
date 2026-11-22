import React from 'react';
import {
    act, cleanup, fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import { MemoryRouter, Route } from 'react-router-dom';
import itemCacheReducer from '../store/reducers/itemCache';
import { ADD_ITEM_LIST_CACHE } from '../store/types';
import i18n from '../i18n';
import { chancePercent, upgradeThreshold } from '../helpers/upgrade';
import Upgrade from './Upgrade';

jest.mock('../api/all/upgrade', () => ({ getUpgradeTargets: jest.fn(), postUpgrade: jest.fn() }));
jest.mock('../api/all/storage', () => ({ getProfileStorage: jest.fn() }));
jest.mock('../store/actions/itemCache', () => ({ itemInfoFetch: jest.fn(() => () => Promise.resolve()) }));

const { getUpgradeTargets, postUpgrade } = require('../api/all/upgrade');
const { getProfileStorage } = require('../api/all/storage');
const { itemInfoFetch } = require('../store/actions/itemCache');

const PLAYER = { id: 1, login: 'player' };
const ROWS = Array.from({ length: 10 }, (_, index) => ({
    storage_id: 101 + index,
    storage_itemId: index + 1,
    storage_color: index === 7 ? 'painted' : 'default',
    storage_status: 'inventory',
}));
const ITEMS = Object.fromEntries(ROWS.map((row) => [row.storage_itemId, {
    item_itemId: row.storage_itemId,
    item_name: `Stake ${row.storage_itemId}`,
    item_grade: 'restricted',
    item_imagePath: `/img/stake-${row.storage_itemId}.webp`,
    pricesInCredits: row.storage_itemId < 9 ? { default: 10, painted: 25 } : { painted: 50 },
}]));
const TARGETS = [
    {
        itemId: 51, color: 'default', name: 'Target skin', grade: 'covert', imagePath: '/img/target.webp', price: 20,
    },
    {
        itemId: 51, color: 'painted', name: 'Target skin', grade: 'covert', imagePath: '/img/target.webp', price: 40,
    },
    {
        itemId: 52, color: 'default', name: 'Target knife', grade: 'special', imagePath: '/img/knife.webp', price: 200,
    },
];
const win = {
    upgradeId: 1,
    won: true,
    roll: 123456,
    threshold: 450000,
    stakeValue: '10.00',
    targetPrice: '20.00',
    nonce: 5,
    serverSeedHash: 'a'.repeat(64),
    clientSeed: 'client',
    item: { storage_id: 201, storage_itemId: 51, storage_color: 'default' },
};

const deferred = () => {
    let settle;
    let fail;
    const promise = new Promise((resolve, reject) => { settle = resolve; fail = reject; });
    return { promise, resolve: settle, reject: fail };
};

let reducedMotion = false;
const originalMatchMedia = window.matchMedia;

beforeEach(async () => {
    jest.resetAllMocks();
    itemInfoFetch.mockImplementation(() => () => Promise.resolve());
    reducedMotion = false;
    window.matchMedia = jest.fn((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)' && reducedMotion,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    }));
    await i18n.changeLanguage('en');
    getProfileStorage.mockResolvedValue({ status: 200, data: ROWS });
    getUpgradeTargets.mockResolvedValue({ status: 200, data: { items: TARGETS, total: 3 } });
    postUpgrade.mockResolvedValue({ status: 200, data: win });
});

afterEach(() => {
    cleanup();
    jest.useRealTimers();
    window.matchMedia = originalMatchMedia;
});

afterAll(() => i18n.changeLanguage('uk'));

const renderPage = (user = PLAYER) => {
    const store = createStore(combineReducers({
        user: (state = user) => state,
        itemCache: itemCacheReducer,
    }), { user, itemCache: ITEMS }, applyMiddleware(thunk));
    const view = render(
        <Provider store={store}>
            <MemoryRouter initialEntries={['/upgrade']}>
                <Route path="/upgrade"><Upgrade /></Route>
                <Route path="/login" render={({ location }) => <div>{`login ${JSON.stringify(location.state)}`}</div>} />
            </MemoryRouter>
        </Provider>,
    );
    return { ...view, store };
};

const stake = (id) => screen.getByRole('button', { name: new RegExp(`^Stake ${id},`) });
const submit = () => screen.getByRole('button', { name: i18n.t('upgrade.submit') });
const selectPair = async () => {
    await screen.findByRole('button', { name: /^Stake 1,/ });
    fireEvent.click(stake(1));
    fireEvent.click(await screen.findByRole('button', { name: /^Target skin, Regular,/ }));
};

const selectFilteredTargetPage = async () => {
    getUpgradeTargets.mockResolvedValue({ status: 200, data: { items: TARGETS, total: 63 } });
    await selectPair();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: i18n.t('upgrade.multiplier', { multiplier: 2 }) })); });
    jest.useFakeTimers('legacy');
    fireEvent.change(screen.getByRole('textbox', { name: i18n.t('upgrade.search') }), { target: { value: '  Target skin  ' } });
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(getUpgradeTargets).toHaveBeenLastCalledWith({
        minPrice: 18, maxPrice: 22, search: 'Target skin', limit: 60, offset: 0,
    });
    jest.useRealTimers();
    expect(screen.getByRole('button', { name: i18n.t('upgrade.nextTargets') })).toBeEnabled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: i18n.t('upgrade.nextTargets') })); });
    fireEvent.click(screen.getByRole('button', { name: /^Target skin, Regular,/ }));
    expect(getUpgradeTargets).toHaveBeenLastCalledWith({
        minPrice: 18, maxPrice: 22, search: 'Target skin', limit: 60, offset: 60,
    });
};

test('guests see the rules and can sign in with a return to this page', () => {
    renderPage({});
    expect(screen.getByText(i18n.t('upgrade.intro'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('upgrade.signIn') }));
    expect(screen.getByText('login {"goBack":true}')).toBeInTheDocument();
    expect(getProfileStorage).not.toHaveBeenCalled();
    expect(getUpgradeTargets).not.toHaveBeenCalled();
});

test('a store without a user shows the guest view', () => {
    renderPage({});
    expect(screen.getByRole('button', { name: i18n.t('upgrade.signIn') })).toBeInTheDocument();
    expect(screen.getByText(i18n.t('upgrade.guest'))).toBeInTheDocument();
    expect(getProfileStorage).not.toHaveBeenCalled();
    expect(getUpgradeTargets).not.toHaveBeenCalled();
});

test('inventory uses the cache, counts only the chosen colour price, and refuses a seventh stake', async () => {
    renderPage();
    await screen.findByRole('button', { name: /^Stake 1,/ });
    expect(getProfileStorage).toHaveBeenCalledWith({ status: 'inventory', limit: 200, offset: 0 });
    expect(itemInfoFetch).toHaveBeenCalledWith(1);
    fireEvent.click(stake(8));
    expect(screen.getByLabelText(i18n.t('upgrade.stakeValue'))).toHaveTextContent('25.00');
    fireEvent.click(stake(8));
    [1, 2, 3, 4, 5, 6].forEach((id) => fireEvent.click(stake(id)));
    fireEvent.click(stake(7));
    expect(stake(7)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText(i18n.t('upgrade.stakeValue'))).toHaveTextContent('60.00');
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('upgrade.selectionLimit', { count: 6 }));
    await act(async () => { fireEvent.click(stake(1)); });
    expect(screen.getByLabelText(i18n.t('upgrade.stakeValue'))).toHaveTextContent('50.00');
});

test('a missing colour price disables selection and explains why', async () => {
    renderPage();
    await screen.findByRole('button', { name: /^Stake 9,/ });
    expect(stake(9)).toBeDisabled();
    expect(stake(9)).toHaveAttribute('title', expect.stringContaining(i18n.t('upgrade.priceUnavailable')));
    expect(stake(9)).toHaveAccessibleName(expect.stringContaining(i18n.t('upgrade.priceUnavailable')));
    expect(submit()).toBeDisabled();
});

test('targets use the stake range and the selected multiplier window', async () => {
    renderPage();
    await selectPair();
    expect(getUpgradeTargets).toHaveBeenLastCalledWith({
 minPrice: 12, maxPrice: 900, limit: 60, offset: 0,
});
    expect(screen.getByRole('img', { name: i18n.t('upgrade.ringLabel', { chance: chancePercent(upgradeThreshold(1000, 2000), 'en') }) })).toBeInTheDocument();
    expect(submit()).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('upgrade.multiplier', { multiplier: 2 }) }));
    await waitFor(() => expect(getUpgradeTargets).toHaveBeenLastCalledWith({
 minPrice: 18, maxPrice: 22, limit: 60, offset: 0,
}));
    expect(submit()).toBeDisabled();
});

test('search is debounced and trimmed, and clearing it omits the parameter', async () => {
    renderPage();
    await selectPair();
    jest.useFakeTimers('legacy');
    const input = screen.getByRole('textbox', { name: i18n.t('upgrade.search') });
    const count = getUpgradeTargets.mock.calls.length;
    fireEvent.change(input, { target: { value: '  knife  ' } });
    expect(getUpgradeTargets).toHaveBeenCalledTimes(count);
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(getUpgradeTargets).toHaveBeenLastCalledWith({
        minPrice: 12, maxPrice: 900, search: 'knife', limit: 60, offset: 0,
    });
    fireEvent.change(input, { target: { value: '   ' } });
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(getUpgradeTargets).toHaveBeenLastCalledWith({
 minPrice: 12, maxPrice: 900, limit: 60, offset: 0,
});
});

test('target pages request the next offset and return to the first page', async () => {
    getUpgradeTargets.mockResolvedValue({ status: 200, data: { items: TARGETS, total: 63 } });
    renderPage();
    await selectPair();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('upgrade.nextTargets') }));
    await waitFor(() => expect(getUpgradeTargets).toHaveBeenLastCalledWith({
 minPrice: 12, maxPrice: 900, limit: 60, offset: 60,
}));
    await waitFor(() => expect(screen.getByRole('button', { name: i18n.t('upgrade.previousTargets') })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: i18n.t('upgrade.previousTargets') }));
    await waitFor(() => expect(getUpgradeTargets).toHaveBeenLastCalledWith({
 minPrice: 12, maxPrice: 900, limit: 60, offset: 0,
}));
});

test('an older target response cannot replace the list for a newer stake', async () => {
    const old = deferred();
    getUpgradeTargets.mockReturnValueOnce(old.promise);
    renderPage();
    await screen.findByRole('button', { name: /^Stake 1,/ });
    fireEvent.click(stake(1));
    fireEvent.click(stake(2));
    await screen.findByRole('button', { name: /^Target skin, Regular,/ });
    await act(async () => old.resolve({ data: { items: [{ ...TARGETS[0], name: 'Obsolete target' }], total: 1 } }));
    expect(screen.queryByRole('button', { name: /Obsolete target/ })).toBeNull();
});

test('a 409 shows the current server values and refreshes the same target page and filters', async () => {
    renderPage();
    await selectFilteredTargetPage();
    const query = getUpgradeTargets.mock.calls[getUpgradeTargets.mock.calls.length - 1][0];
    const calls = getUpgradeTargets.mock.calls.length;
    const refresh = deferred();
    getUpgradeTargets.mockReturnValueOnce(refresh.promise);
    postUpgrade.mockRejectedValueOnce({
        error: 409, code: 'UPGRADE.CHANCE_CHANGED', threshold: 514285, stakeValue: '12.00', targetPrice: '21.00',
    });
    fireEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('server.UPGRADE.CHANCE_CHANGED'));
    const ring = within(screen.getByRole('region', { name: i18n.t('upgrade.chance') }));
    expect(ring.getByLabelText(i18n.t('upgrade.stakeValue'))).toHaveTextContent('12.00');
    expect(ring.getByText(/21\.00/)).toBeInTheDocument();
    expect(ring.queryByText(/20\.00/)).toBeNull();
    expect(ring.getByRole('img', { name: i18n.t('upgrade.ringLabel', { chance: '51.4285%' }) })).toBeInTheDocument();
    expect(stake(1)).toHaveAttribute('aria-pressed', 'true');
    expect(submit()).toBeEnabled();
    expect(getUpgradeTargets).toHaveBeenCalledTimes(calls + 1);
    expect(getUpgradeTargets).toHaveBeenLastCalledWith(query);
    expect(getProfileStorage).toHaveBeenCalledTimes(1);
    await act(async () => refresh.resolve({ data: { items: [{ ...TARGETS[0], price: 21 }, TARGETS[1]], total: 63 } }));
    expect(screen.getByRole('button', { name: /^Target skin, Regular, 21\.00/ })).toHaveAttribute('aria-pressed', 'true');
    expect(ring.getByLabelText(i18n.t('upgrade.stakeValue'))).toHaveTextContent('12.00');
    fireEvent.click(screen.getByRole('button', { name: /^Target skin, Painted,/ }));
    expect(ring.getByLabelText(i18n.t('upgrade.stakeValue'))).toHaveTextContent('10.00');
    expect(ring.getByText(/40\.00/)).toBeInTheDocument();
    expect(ring.getByRole('img', { name: i18n.t('upgrade.ringLabel', { chance: '22.5%' }) })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
});

test.each(['CHANCE_TOO_HIGH', 'CHANCE_TOO_LOW'])('a 422 %s clears the target and refreshes the current catalogue page', async (code) => {
    renderPage();
    await selectFilteredTargetPage();
    const query = getUpgradeTargets.mock.calls[getUpgradeTargets.mock.calls.length - 1][0];
    const calls = getUpgradeTargets.mock.calls.length;
    postUpgrade.mockRejectedValueOnce({ error: 422, code: `UPGRADE.${code}` });
    getUpgradeTargets.mockResolvedValue({ data: { items: [{ ...TARGETS[0], price: 21 }], total: 61 } });
    fireEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t(`server.UPGRADE.${code}`));
    expect(submit()).toBeDisabled();
    expect(stake(1)).toHaveAttribute('aria-pressed', 'true');
    expect(getUpgradeTargets).toHaveBeenCalledTimes(calls + 1);
    expect(getUpgradeTargets).toHaveBeenLastCalledWith(query);
    expect(getProfileStorage).toHaveBeenCalledTimes(1);
    const target = await screen.findByRole('button', { name: /^Target skin, Regular, 21\.00/ });
    expect(target).toHaveAttribute('aria-pressed', 'false');
    const ring = within(screen.getByRole('region', { name: i18n.t('upgrade.chance') }));
    expect(ring.getByText(i18n.t('upgrade.chooseTarget'))).toBeInTheDocument();
    expect(ring.queryByText(/Target skin/)).toBeNull();
    fireEvent.click(target);
    expect(submit()).toBeEnabled();
    expect(screen.queryByRole('alert')).toBeNull();
});

test('a 409 keeps the pair and adopts the current threshold for the next press', async () => {
    postUpgrade.mockRejectedValueOnce({
        error: 409, code: 'UPGRADE.CHANCE_CHANGED', message: 'Chance changed', threshold: 400000,
    });
    renderPage();
    await selectPair();
    fireEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('server.UPGRADE.CHANCE_CHANGED'));
    expect(stake(1)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: i18n.t('upgrade.ringLabel', { chance: '40%' }) })).toBeInTheDocument();
    expect(submit()).toBeEnabled();
    expect(getProfileStorage).toHaveBeenCalledTimes(1);
    await act(async () => { fireEvent.click(submit()); });
    expect(postUpgrade).toHaveBeenLastCalledWith({
        storageIds: [101], targetItemId: 51, targetColor: 'default', expectedThreshold: 400000,
    });
});

test('a changed chance outside the allowed bounds requires a different selection', async () => {
    postUpgrade.mockRejectedValueOnce({ error: 409, message: 'Chance changed', threshold: 750001 });
    renderPage();
    await selectPair();
    fireEvent.click(submit());
    await screen.findByRole('alert');
    expect(submit()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^Target skin, Painted,/ }));
    expect(submit()).toBeEnabled();
});

test.each([true, false])('a completed roll shows won=%p after four seconds, reloads inventory, and clears the stake', async (won) => {
    const pending = deferred();
    postUpgrade.mockReturnValueOnce(pending.promise);
    const { container } = renderPage();
    await selectPair();
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeEmptyDOMElement();
    submit().focus();
    expect(submit()).toHaveFocus();
    jest.useFakeTimers('legacy');
    fireEvent.click(submit());
    fireEvent.click(submit());
    expect(postUpgrade).toHaveBeenCalledTimes(1);
    expect(postUpgrade).toHaveBeenCalledWith({
        storageIds: [101], targetItemId: 51, targetColor: 'default', expectedThreshold: 450000,
    });
    container.querySelectorAll('button, input').forEach((control) => expect(control).toBeDisabled());
    await act(async () => pending.resolve({
 status: 200,
data: {
 ...win, won, roll: won ? 123456 : 987654, item: won ? win.item : null,
},
}));
    container.querySelectorAll('button, input').forEach((control) => expect(control).toBeDisabled());
    expect(screen.queryByText(i18n.t(won ? 'upgrade.won' : 'upgrade.lost'))).toBeNull();
    expect(container.querySelector('.upgrade-ring__pointer').style.transform).toBe(won ? 'rotate(1484.44416deg)' : 'rotate(1795.55544deg)');
    await act(async () => { jest.advanceTimersByTime(3999); });
    expect(getProfileStorage).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(1); });
    const result = screen.getByRole('status');
    expect(result).toBe(liveRegion);
    expect(result).toHaveTextContent(i18n.t(won ? 'upgrade.won' : 'upgrade.lost'));
    expect(within(result).getByRole('heading', { name: i18n.t(won ? 'upgrade.won' : 'upgrade.lost') })).toHaveFocus();
    if (won) {
        expect(within(result).getByText('Target skin')).toBeInTheDocument();
        expect(result.style.getPropertyValue('--rarity')).toBe('#eb4b4b');
    }
    expect(getProfileStorage).toHaveBeenCalledTimes(2);
    expect(stake(1)).toHaveAttribute('aria-pressed', 'false');
    expect(submit()).toBeDisabled();
});

test.each([true, false])('reduced motion shows won=%p immediately, focuses the result, and reloads inventory', async (won) => {
    reducedMotion = true;
    postUpgrade.mockResolvedValue({ status: 200, data: { ...win, won, item: won ? win.item : null } });
    renderPage();
    await selectPair();
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeEmptyDOMElement();
    submit().focus();
    await act(async () => { fireEvent.click(submit()); });
    expect(screen.getByRole('status')).toBe(liveRegion);
    expect(liveRegion).toHaveTextContent(i18n.t(won ? 'upgrade.won' : 'upgrade.lost'));
    expect(within(liveRegion).getByRole('heading', { name: i18n.t(won ? 'upgrade.won' : 'upgrade.lost') })).toHaveFocus();
    expect(getProfileStorage).toHaveBeenCalledTimes(2);
});

test.each([
    [{ error: 422, message: 'Item unavailable' }, 'Item unavailable'],
    [{ error: 500, message: 'Internal details' }, 'A server error occurred'],
    [new TypeError('Network failed'), 'A server error occurred'],
])('upgrade failure %p leaves the selection and reports %s', async (error, text) => {
    postUpgrade.mockRejectedValueOnce(error);
    renderPage();
    await selectPair();
    fireEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(stake(1)).toHaveAttribute('aria-pressed', 'true');
    expect(submit()).toBeEnabled();
    expect(getProfileStorage).toHaveBeenCalledTimes(1);
});

test('inventory and target load errors can be retried', async () => {
    getProfileStorage.mockRejectedValueOnce({ error: 500 });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('common.serverError'));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('upgrade.retryInventory') }));
    await screen.findByRole('button', { name: /^Stake 1,/ });
    getUpgradeTargets.mockRejectedValueOnce({ error: 500 });
    fireEvent.click(stake(1));
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('common.serverError'));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('upgrade.retryTargets') }));
    expect(await screen.findByRole('button', { name: /^Target skin, Regular,/ })).toBeEnabled();
});

test('a cache update that removes a selected price prevents an upgrade', async () => {
    const { store } = renderPage();
    await selectPair();
    act(() => { store.dispatch({ type: ADD_ITEM_LIST_CACHE, payloadItems: { 1: { ...ITEMS[1], pricesInCredits: {} } } }); });
    expect(submit()).toBeDisabled();
    fireEvent.click(stake(1));
    expect(stake(1)).toHaveAttribute('aria-pressed', 'false');
});

test('switching languages updates the page, labels, chance and a translated server refusal', async () => {
    postUpgrade.mockRejectedValueOnce({ error: 429, code: 'LIMIT.VERIFY', message: 'Too many checks. Wait a little.' });
    renderPage();
    await selectPair();
    fireEvent.click(submit());
    await screen.findByRole('alert');
    await act(async () => i18n.changeLanguage('uk'));
    expect(screen.getByRole('heading', { name: i18n.t('upgrade.title') })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('server.LIMIT.VERIFY'));
    expect(screen.getByRole('textbox', { name: i18n.t('upgrade.search') })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: i18n.t('upgrade.ringLabel', { chance: chancePercent(450000, 'uk') }) })).toBeInTheDocument();
    expect(getProfileStorage).toHaveBeenCalledTimes(1);
});

test('leaving during a roll cancels the result timer and inventory reload', async () => {
    const view = renderPage();
    await selectPair();
    jest.useFakeTimers('legacy');
    await act(async () => { fireEvent.click(submit()); });
    view.unmount();
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(getProfileStorage).toHaveBeenCalledTimes(1);
});

test('retrying a failed inventory refresh requests the first page again', async () => {
    renderPage();
    await selectPair();
    getProfileStorage.mockRejectedValueOnce({ error: 500 });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('upgrade.reloadInventory') }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: i18n.t('upgrade.retryInventory') }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(getProfileStorage).toHaveBeenLastCalledWith({ status: 'inventory', limit: 200, offset: 0 });
    expect(stake(1)).toHaveAttribute('aria-pressed', 'false');
});
