import React from 'react';
import {
    act, fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { MemoryRouter } from 'react-router-dom';
import { Modal } from 'antd';
import ProvablyFair from './ProvablyFair';
import i18n from '../i18n';
import itemCacheReducer from '../store/reducers/itemCache';
import { getItemsInfo } from '../api/all/item';
import { getUpgradeHistory, verifyUpgrade } from '../api/all/upgrade';
import { getProvablyFairState, getOpenHistory, rotateSeed } from '../api/all/provablyFair';

jest.mock('../api/all/upgrade', () => ({ getUpgradeHistory: jest.fn(), verifyUpgrade: jest.fn() }));
jest.mock('../api/all/provablyFair', () => ({
    getProvablyFairState: jest.fn(), getOpenHistory: jest.fn(), setClientSeed: jest.fn(), rotateSeed: jest.fn(), verifyOpen: jest.fn(),
}));
jest.mock('../api/all/item', () => ({ getItemsInfo: jest.fn() }));
jest.mock('../components/mini/openNotification', () => jest.fn());

const ITEMS = {
    10: { item_itemId: 10, item_name: 'Nova | Rising Sun', item_grade: 'restricted' },
    11: { item_itemId: 11, item_name: 'AWP | Worm God', item_grade: 'restricted' },
    12: { item_itemId: 12, item_name: 'Butterfly Knife | Fade', item_grade: 'special' },
};
const record = (upgradeId, extra = {}) => ({
    upgradeId,
    created_at: '2026-11-22T12:00:00Z',
    nonce: upgradeId,
    clientSeed: ' client seed ',
    serverSeedHash: `hash-${upgradeId}`,
    revealedServerSeed: 'revealed seed',
    stake: [{ itemId: 10, color: 'default', price: '10.00' }, { itemId: 11, color: 'painted', price: '5.00' }],
    stakeValue: '15.00',
    targetItemId: 12,
    targetColor: 'painted',
    targetPrice: '30.00',
    threshold: 450000,
    roll: 123456,
    won: true,
    ...extra,
});

const renderPage = (user = {}) => {
    const store = createStore(combineReducers({ user: (state = user) => state, itemCache: itemCacheReducer }), applyMiddleware(thunk));
    return render(<Provider store={store}><MemoryRouter><ProvablyFair /></MemoryRouter></Provider>);
};
const click = (key) => fireEvent.click(screen.getByRole('button', { name: i18n.t(`provablyFair.${key}`), exact: true }));
const change = (key, value) => fireEvent.change(screen.getByLabelText(i18n.t(`provablyFair.${key}`)), { target: { value } });
const fill = (chance = '9.0909') => {
    click('upgradeMode');
    change('serverSeedPlaceholder', 'server');
    change('clientSeedPlaceholder', ' client ');
    change('nonce', '3');
    change('upgradeChance', chance);
};

beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
    getProvablyFairState.mockResolvedValue({ data: { active: { serverSeedHash: 'active-hash', nonce: 20, clientSeed: 'client' }, previous: null } });
    getOpenHistory.mockResolvedValue({ data: [] });
    getUpgradeHistory.mockResolvedValue({ data: { items: [record(12)], total: 1 } });
    getItemsInfo.mockImplementation((ids) => Promise.resolve({ data: Object.fromEntries(ids.filter((id) => ITEMS[id]).map((id) => [id, ITEMS[id]])) }));
    verifyUpgrade.mockResolvedValue({ data: { roll: 1, threshold: 90909, won: true } });
});

afterEach(() => Modal.destroyAll());
afterAll(() => i18n.changeLanguage('uk'));

test('the public calculator posts a rounded threshold and shows the roll with four decimals', async () => {
    renderPage();
    fill();
    click('compute');
    expect(await screen.findByText('0.0001%')).toBeInTheDocument();
    expect(screen.getByText('90909')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('provablyFair.upgradeWon'))).toBeInTheDocument();
    expect(verifyUpgrade).toHaveBeenCalledWith({
 serverSeed: 'server', clientSeed: ' client ', nonce: 3, threshold: 90909,
});
    expect(getUpgradeHistory).not.toHaveBeenCalled();
    click('case');
    expect(screen.getByPlaceholderText(i18n.t('provablyFair.caseIdPlaceholder'))).toBeInTheDocument();
});

test.each([
    ['0', 0], ['100', 1000000], ['0.0001', 1], ['9.0909', 90909], ['45,1234', 451234],
])('chance %s sends integer threshold %i', async (chance, threshold) => {
    renderPage();
    fill(chance);
    click('compute');
    await screen.findByText('0.0001%');
    expect(verifyUpgrade).toHaveBeenCalledWith(expect.objectContaining({ threshold }));
});

test.each(['', '-1', '100.0001', '9.09091', '1e1', 'NaN'])('invalid chance %s is rejected before a request', (chance) => {
    renderPage();
    fill(chance);
    click('compute');
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('provablyFair.upgradeInvalidInputs'));
    expect(verifyUpgrade).not.toHaveBeenCalled();
});

test.each(['-1', '1.2', '1e1', '9007199254740992'])('invalid nonce %s is rejected before a request', (nonce) => {
    renderPage();
    fill();
    change('nonce', nonce);
    click('compute');
    expect(verifyUpgrade).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('provablyFair.upgradeInvalidInputs'));
});

test('manual verification by id sends no threshold and displays all three mismatch flags', async () => {
    verifyUpgrade.mockResolvedValue({
 data: {
        roll: 999999, threshold: 450000, won: false, seedMatches: false, inputsMatchRecord: false, matchesRecord: false,
    },
});
    renderPage();
    fill();
    click('upgradeById');
    change('upgradeId', '12');
    click('compute');
    expect(await screen.findByText('99.9999%')).toBeInTheDocument();
    expect(verifyUpgrade).toHaveBeenCalledWith({
 serverSeed: 'server', clientSeed: ' client ', nonce: 3, upgradeId: 12,
});
    ['upgradeLost', 'upgradeSeedMismatch', 'upgradeInputsMismatch', 'upgradeRecordMismatch'].forEach((key) => {
        expect(screen.getByText(i18n.t(`provablyFair.${key}`))).toBeInTheDocument();
    });
});

test('an invalid upgrade id cannot submit', () => {
    renderPage();
    fill();
    click('upgradeById');
    change('upgradeId', '0');
    click('compute');
    expect(verifyUpgrade).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('provablyFair.upgradeInvalidInputs'));
});

test('history uses the item cache, renders both results and revealed seeds, and pages forward and back', async () => {
    const first = Array.from({ length: 10 }, (_, index) => record(20 - index, index === 0 ? { revealedServerSeed: null, won: false, roll: 800000 } : {}));
    getUpgradeHistory.mockImplementation((limit, offset) => Promise.resolve({ data: { items: offset ? [record(10)] : first, total: 11 } }));
    renderPage({ id: 1, login: 'player' });
    const newest = within(await screen.findByRole('article', { name: i18n.t('provablyFair.upgradeRecord', { id: 20 }) }));
    expect(await newest.findByText('Nova | Rising Sun')).toBeInTheDocument();
    expect(newest.getByText('AWP | Worm God')).toBeInTheDocument();
    expect(newest.getByText('Butterfly Knife | Fade')).toBeInTheDocument();
    expect(newest.getByText('45%')).toBeInTheDocument();
    expect(newest.getByText('80.0000%')).toBeInTheDocument();
    expect(newest.getByText(i18n.t('provablyFair.upgradeLost'))).toBeInTheDocument();
    expect(newest.queryByText('revealed seed')).toBeNull();
    expect(newest.getByRole('button', { name: i18n.t('provablyFair.upgradeCheck', { id: 20 }) })).toBeDisabled();
    expect(screen.getAllByText('revealed seed')).toHaveLength(9);
    expect(getItemsInfo).toHaveBeenCalledTimes(1);
    expect(getItemsInfo.mock.calls[0][0].sort()).toEqual(['10', '11', '12']);
    expect(getUpgradeHistory).toHaveBeenCalledWith(10, 0);
    click('upgradeNext');
    expect(await screen.findByRole('article', { name: i18n.t('provablyFair.upgradeRecord', { id: 10 }) })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(getUpgradeHistory).toHaveBeenLastCalledWith(10, 10);
    expect(screen.getByRole('button', { name: i18n.t('provablyFair.upgradeNext') })).toBeDisabled();
    click('upgradePrevious');
    await screen.findByRole('article', { name: i18n.t('provablyFair.upgradeRecord', { id: 20 }) });
    expect(getUpgradeHistory).toHaveBeenLastCalledWith(10, 0);
});

test('checking history fills seeds, nonce and id and displays all three matching flags', async () => {
    verifyUpgrade.mockResolvedValue({
 data: {
        roll: 123456, threshold: 450000, won: true, seedMatches: true, inputsMatchRecord: true, matchesRecord: true,
    },
});
    renderPage({ id: 1, login: 'player' });
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('provablyFair.upgradeCheck', { id: 12 }) }));
    expect(screen.getByLabelText(i18n.t('provablyFair.serverSeedPlaceholder'))).toHaveValue('revealed seed');
    expect(screen.getByLabelText(i18n.t('provablyFair.clientSeedPlaceholder'))).toHaveValue(' client seed ');
    expect(screen.getByLabelText(i18n.t('provablyFair.nonce'))).toHaveValue('12');
    expect(screen.getByLabelText(i18n.t('provablyFair.upgradeId'))).toHaveValue('12');
    click('compute');
    expect(await screen.findByText(i18n.t('provablyFair.upgradeRecordMatches'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('provablyFair.upgradeSeedMatches'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('provablyFair.upgradeInputsMatch'))).toBeInTheDocument();
    expect(verifyUpgrade).toHaveBeenCalledWith({
 serverSeed: 'revealed seed', clientSeed: ' client seed ', nonce: 12, upgradeId: 12,
});
});

test('repeated staked items keep their quantity and names when the language changes', async () => {
    getUpgradeHistory.mockResolvedValue({
 data: {
 items: [record(12, {
        stake: [{ itemId: 10, color: 'painted', price: '5.00' }, { itemId: 10, color: 'painted', price: '5.00' }], stakeValue: '10.00',
    })],
total: 1,
},
});
    renderPage({ id: 1, login: 'player' });
    await screen.findByText('Nova | Rising Sun');
    expect(screen.getByText(i18n.t('provablyFair.upgradeItemCount', { count: 2 }))).toBeInTheDocument();
    expect(screen.getAllByText(/Painted/)).toHaveLength(2);
    expect(screen.getByText('12.3456%')).toBeInTheDocument();
    await act(async () => i18n.changeLanguage('uk'));
    expect(screen.getByText('Nova | Rising Sun')).toBeInTheDocument();
    expect(screen.getByText(/12,3456\s?%/)).toBeInTheDocument();
    expect(screen.getByText(i18n.t('provablyFair.upgradeItemCount', { count: 2 }))).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: i18n.t('provablyFair.upgradeHistory') })).toBeInTheDocument();
});

test('a history refusal shows the server reason without claiming the history is empty', async () => {
    getUpgradeHistory.mockRejectedValue({ error: 429, code: 'LIMIT.VERIFY', message: 'Too many checks. Wait a little.' });
    renderPage({ id: 1, login: 'player' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many checks. Wait a little.');
    expect(screen.queryByText(i18n.t('provablyFair.upgradeHistoryEmpty'))).toBeNull();
});

test.each([
    [{ error: 422, code: 'PROVABLY_FAIR.UPGRADE_NOT_FOUND', message: 'Unknown upgrade' }, 'server.PROVABLY_FAIR.UPGRADE_NOT_FOUND'],
    [{ error: 500, message: 'internal detail' }, 'common.serverError'],
    [new TypeError('Failed to fetch'), 'common.serverError'],
])('calculator failures use server text only for refusals (%p)', async (failure, expected) => {
    verifyUpgrade.mockRejectedValue(failure);
    renderPage();
    fill();
    click('compute');
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t(expected));
    expect(screen.queryByText('internal detail')).toBeNull();
});

test('a refusal and the calculator labels follow a language change', async () => {
    verifyUpgrade.mockRejectedValue({ error: 429, code: 'LIMIT.VERIFY', message: 'Too many checks. Wait a little.' });
    renderPage();
    fill();
    click('compute');
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many checks. Wait a little.');
    await act(async () => i18n.changeLanguage('uk'));
    expect(screen.getByRole('alert')).toHaveTextContent('Забагато перевірок. Зачекайте трохи.');
    expect(screen.getByLabelText(i18n.t('provablyFair.upgradeChance'))).toHaveValue('9.0909');
});

test('history failures can be retried and an empty history is explicit', async () => {
    getUpgradeHistory.mockRejectedValueOnce({ error: 500, message: 'internal detail' });
    getUpgradeHistory.mockResolvedValue({ data: { items: [], total: 0 } });
    renderPage({ id: 1, login: 'player' });
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('common.serverError'));
    expect(screen.queryByText('internal detail')).toBeNull();
    click('upgradeHistoryRetry');
    expect(await screen.findByText(i18n.t('provablyFair.upgradeHistoryEmpty'))).toBeInTheDocument();
    expect(getUpgradeHistory).toHaveBeenCalledTimes(2);
});

test('rotating the seed reloads upgrade history so newly revealed seeds can be checked', async () => {
    getUpgradeHistory.mockResolvedValueOnce({ data: { items: [record(12, { revealedServerSeed: null })], total: 1 } });
    rotateSeed.mockResolvedValue({ data: {} });
    renderPage({ id: 1, login: 'player' });
    const checkName = i18n.t('provablyFair.upgradeCheck', { id: 12 });
    expect(await screen.findByRole('button', { name: checkName })).toBeDisabled();
    getProvablyFairState.mockResolvedValue({ data: { active: { serverSeedHash: 'next-hash', clientSeed: 'client', nonce: 0 }, previous: { serverSeed: 'revealed seed' } } });
    const confirm = jest.spyOn(Modal, 'confirm').mockImplementation(({ onOk }) => { onOk(); });
    click('rotate');
    await waitFor(() => expect(screen.getByRole('button', { name: checkName })).toBeEnabled());
    expect(getUpgradeHistory).toHaveBeenCalledTimes(2);
    confirm.mockRestore();
});

test('an in-flight calculation disables edits and cannot overwrite the calculator after switching modes', async () => {
    let finish;
    verifyUpgrade.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    renderPage();
    fill();
    click('compute');
    expect(screen.getByLabelText(i18n.t('provablyFair.upgradeChance'))).toBeDisabled();
    expect(screen.getByRole('button', { name: i18n.t('provablyFair.compute') })).toBeDisabled();
    click('case');
    click('upgradeMode');
    await act(async () => finish({ data: { roll: 123456, threshold: 90909, won: false } }));
    expect(screen.queryByText('12.3456%')).toBeNull();
});
