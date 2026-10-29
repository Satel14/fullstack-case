import React from 'react';
import {
    render, screen, fireEvent, waitFor, within, act,
} from '@testing-library/react';
import { Modal } from 'antd';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { MemoryRouter, Route } from 'react-router-dom';
import itemCacheReducer from '../store/reducers/itemCache';
import usersReducer from '../store/reducers/user';
import { LOGIN_USER } from '../store/types';
import ProvablyFair from './ProvablyFair';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../api/all/provablyFair', () => ({
    getProvablyFairState: jest.fn(),
    setClientSeed: jest.fn(),
    rotateSeed: jest.fn(),
    getOpenHistory: jest.fn(),
    verifyOpen: jest.fn(),
}));

jest.mock('../components/mini/openNotification', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('../api/all/item', () => ({ getItemsInfo: jest.fn() }));

const api = require('../api/all/provablyFair');
const { getItemsInfo } = require('../api/all/item');

const ITEMS = {
    10: { item_itemId: 10, item_name: 'Nova | Rising Sun', item_grade: 'restricted' },
    11: { item_itemId: 11, item_name: 'AWP | Worm God', item_grade: 'restricted' },
    12: { item_itemId: 12, item_name: 'Butterfly Knife | Fade', item_grade: 'special' },
};

const PLAYER = { login: 'player', id: 1 };

const renderPage = (user = PLAYER, userReducer = (state = user) => state) => {
    const store = createStore(
        combineReducers({ user: userReducer, itemCache: itemCacheReducer }),
        applyMiddleware(thunk),
    );
    return {
        store,
        ...render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/provably-fair']}>
                    <Route path="/provably-fair"><ProvablyFair /></Route>
                    <Route path="/login" render={({ location }) => <div>{`login page ${JSON.stringify(location.state)}`}</div>} />
                </MemoryRouter>
            </Provider>,
        ),
    };
};
const openNotification = require('../components/mini/openNotification').default;

const ROWS = [
    {
        id: 5,
caseId: 'dust2',
nonce: 1,
clientSeed: 'client',
resultItemId: 10,
resultColor: 'default',
        revealedServerSeed: 'server',
hasSnapshot: true,
verification: 'snapshot',
    },
    {
        id: 4,
caseId: 'dust2',
nonce: 0,
clientSeed: 'client',
resultItemId: 11,
resultColor: 'default',
        revealedServerSeed: 'server',
hasSnapshot: false,
verification: 'none',
    },
    {
        id: 3,
caseId: 'train',
nonce: 7,
clientSeed: 'client',
resultItemId: 12,
resultColor: 'default',
        revealedServerSeed: 'server',
hasSnapshot: false,
verification: 'current',
    },
];

beforeEach(() => {
    api.getProvablyFairState.mockResolvedValue({
        data: { active: { serverSeedHash: 'hash', nonce: 2, clientSeed: 'client' }, previous: null },
    });
    api.getOpenHistory.mockResolvedValue({ data: ROWS });
    api.verifyOpen.mockReset();
    getItemsInfo.mockImplementation((ids) => Promise.resolve({
        data: Object.fromEntries(ids.filter((id) => ITEMS[id]).map((id) => [id, ITEMS[id]])),
    }));
});

afterEach(() => {
    Modal.destroyAll();
});

test('seeds that cannot be loaded leave an error with a retry instead of a blank page', async () => {
    api.getProvablyFairState.mockRejectedValueOnce({ error: 500 });
    renderPage();

    expect(await screen.findByText('provablyFair.loadFailed')).toBeInTheDocument();
    expect(api.getOpenHistory).not.toHaveBeenCalled();
    expect(screen.getByText('provablyFair.algorithm')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'provablyFair.compute' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /provablyFair\.retry/ }));

    expect(await screen.findByText('hash')).toBeInTheDocument();
    expect(await screen.findAllByText('dust2')).toHaveLength(2);
    expect(screen.queryByText('provablyFair.loadFailed')).toBeNull();
});

test('a history that cannot be loaded is shown as an error, not as an empty table, and can be retried', async () => {
    api.getOpenHistory.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { container } = renderPage();

    expect(await screen.findByText('provablyFair.historyFailed')).toBeInTheDocument();
    expect(screen.getByText('hash')).toBeInTheDocument();
    expect(container.querySelector('.ant-table')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /provablyFair\.retry/ }));

    expect(await screen.findAllByText('dust2')).toHaveLength(2);
    expect(screen.queryByText('provablyFair.historyFailed')).toBeNull();
});

const saveClientSeed = async (value) => {
    renderPage();
    await screen.findByText('hash');
    fireEvent.change(screen.getByDisplayValue('client'), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.save' }));
};

test('a saved client seed is confirmed and the seeds are reloaded', async () => {
    api.setClientSeed.mockResolvedValue({ status: 200, message: 'Client seed оновлено' });

    await saveClientSeed('lucky');

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('success', 'provablyFair.clientSeedSaved'));
    expect(api.setClientSeed).toHaveBeenCalledWith('lucky');
    expect(api.getProvablyFairState).toHaveBeenCalledTimes(2);
});

test('a client seed the server refuses shows its reason in a single toast', async () => {
    api.setClientSeed.mockRejectedValue({ error: 422, message: 'Некоректний client seed' });

    await saveClientSeed(' ');

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'Некоректний client seed'));
    expect(openNotification).toHaveBeenCalledTimes(1);
});

test('a client seed change that fails on the server shows a server error, not its text', async () => {
    api.setClientSeed.mockRejectedValue({ error: 500, message: 'ER_LOCK_DEADLOCK raw text' });

    await saveClientSeed('lucky');

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'common.serverError'));
    expect(openNotification).toHaveBeenCalledTimes(1);
});

const confirmRotation = async () => {
    renderPage();
    await screen.findByText('hash');
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.rotate' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));
};

test('a rotation is confirmed', async () => {
    api.rotateSeed.mockResolvedValue({ status: 200, data: {} });

    await confirmRotation();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('success', 'provablyFair.rotated'));
    expect(api.getProvablyFairState).toHaveBeenCalledTimes(2);
});

test('a rotation stopped by the limiter shows its reason in a single toast', async () => {
    api.rotateSeed.mockRejectedValue({ error: 429, message: 'Забагато запитів. Зачекайте трохи.' });

    await confirmRotation();

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'common.error', 'Забагато запитів. Зачекайте трохи.'));
    expect(openNotification).toHaveBeenCalledTimes(1);
});

const deferred = () => {
    let settle;
    const promise = new Promise((resolve) => { settle = resolve; });
    return { promise, settle };
};

let pageRenders = 0;

const renderNamedPage = () => {
    pageRenders += 1;
    ProvablyFair.displayName = `ProvablyFairPage${pageRenders}`;
    return renderPage();
};

const settleAfterUnmount = async (unmount, pending, value) => {
    const errors = jest.spyOn(console, 'error');
    try {
        unmount();
        await act(async () => {
            pending.settle(value);
            await new Promise((resolve) => { setTimeout(resolve, 0); });
        });
        return errors.mock.calls.filter((call) => /unmounted component/.test(String(call[0]))).length;
    } finally {
        errors.mockRestore();
        delete ProvablyFair.displayName;
    }
};

test('a client seed save that finishes after the page closed loads nothing and sets no state', async () => {
    const save = deferred();
    api.setClientSeed.mockReturnValue(save.promise);
    const { unmount } = renderNamedPage();
    await screen.findAllByText('dust2');
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.save' }));

    const updatesAfterUnmount = await settleAfterUnmount(unmount, save, { status: 200 });

    expect(api.getProvablyFairState).toHaveBeenCalledTimes(1);
    expect(api.getOpenHistory).toHaveBeenCalledTimes(1);
    expect(updatesAfterUnmount).toBe(0);
});

test('a rotation that finishes after the page closed loads nothing and sets no state', async () => {
    const rotation = deferred();
    api.rotateSeed.mockReturnValue(rotation.promise);
    const { unmount } = renderNamedPage();
    await screen.findAllByText('dust2');
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.rotate' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));

    const updatesAfterUnmount = await settleAfterUnmount(unmount, rotation, { status: 200, data: {} });

    expect(api.getProvablyFairState).toHaveBeenCalledTimes(1);
    expect(api.getOpenHistory).toHaveBeenCalledTimes(1);
    expect(updatesAfterUnmount).toBe(0);
});

const opensFrom = (firstId, count) => Array.from({ length: count }, (_, i) => ({
    ...ROWS[0], id: firstId - i, nonce: firstId - i, caseId: `case-${firstId - i}`,
}));

test('older opens beyond the first page are reached with "load more"', async () => {
    api.getOpenHistory
        .mockResolvedValueOnce({ data: opensFrom(60, 50) })
        .mockResolvedValueOnce({ data: opensFrom(10, 10) });
    renderPage();

    expect(await screen.findByText('case-60')).toBeInTheDocument();
    expect(screen.queryByText('case-10')).toBeNull();
    expect(api.getOpenHistory).toHaveBeenCalledWith(50, 0);

    fireEvent.click(screen.getByRole('button', { name: /provablyFair\.loadMore/ }));

    expect(await screen.findByText('case-1')).toBeInTheDocument();
    expect(api.getOpenHistory).toHaveBeenLastCalledWith(50, 50);
    expect(screen.getByText('case-60')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'provablyFair.verify' })).toHaveLength(60);
    expect(screen.queryByRole('button', { name: /provablyFair\.loadMore/ })).toBeNull();
});

test('an open that shifted onto the next page while loading is listed once', async () => {
    api.getOpenHistory
        .mockResolvedValueOnce({ data: opensFrom(60, 50) })
        .mockResolvedValueOnce({ data: opensFrom(11, 11) });
    renderPage();
    await screen.findByText('case-60');

    fireEvent.click(screen.getByRole('button', { name: /provablyFair\.loadMore/ }));

    expect(await screen.findByText('case-1')).toBeInTheDocument();
    expect(screen.getAllByText('case-11')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'provablyFair.verify' })).toHaveLength(60);
});

const serveHistory = (opens) => {
    const server = { opens };
    api.getOpenHistory.mockImplementation((limit, offset) => Promise.resolve({ data: server.opens.slice(offset, offset + limit) }));
    return server;
};

const pressLoadMoreUntil = async (caseId) => {
    fireEvent.click(screen.getByRole('button', { name: /provablyFair\.loadMore/ }));
    expect(await screen.findByText(caseId)).toBeInTheDocument();
};

const shownCases = () => screen.getAllByText(/^case-\d+$/).map((cell) => cell.textContent);

test('"load more" reaches every older open, newest first and once each, after 60 new opens since the list loaded', async () => {
    const server = serveHistory(opensFrom(120, 120));
    renderPage();
    await screen.findByText('case-71');

    server.opens = [...opensFrom(180, 60), ...server.opens];

    await pressLoadMoreUntil('case-31');
    await pressLoadMoreUntil('case-1');

    expect(shownCases()).toEqual(opensFrom(120, 120).map((open) => open.caseId));
    expect(screen.queryByRole('button', { name: /provablyFair\.loadMore/ })).toBeNull();
});

test('"load more" still reaches the older opens when exactly a page of new opens pushed the shown ones down', async () => {
    const server = serveHistory(opensFrom(80, 80));
    renderPage();
    await screen.findByText('case-31');

    server.opens = [...opensFrom(130, 50), ...server.opens];

    await pressLoadMoreUntil('case-1');

    expect(shownCases()).toEqual(opensFrom(80, 80).map((open) => open.caseId));
    expect(screen.queryByRole('button', { name: /provablyFair\.loadMore/ })).toBeNull();
});

test('a "load more" that fails keeps the loaded opens and can be pressed again', async () => {
    api.getOpenHistory
        .mockResolvedValueOnce({ data: opensFrom(60, 50) })
        .mockRejectedValueOnce({ error: 503 })
        .mockResolvedValueOnce({ data: opensFrom(10, 10) });
    renderPage();
    await screen.findByText('case-60');

    fireEvent.click(screen.getByRole('button', { name: /provablyFair\.loadMore/ }));

    expect(await screen.findByText('provablyFair.historyFailed')).toBeInTheDocument();
    expect(screen.getByText('case-60')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /provablyFair\.loadMore/ }));

    expect(await screen.findByText('case-1')).toBeInTheDocument();
    expect(screen.queryByText('provablyFair.historyFailed')).toBeNull();
    expect(api.getOpenHistory).toHaveBeenLastCalledWith(50, 50);
});

const rowOf = async (nonce) => {
    await screen.findAllByText(/dust2|train/);
    return screen.getAllByRole('row').find((r) => within(r).queryByText(String(nonce), { exact: true }));
};

test('an open made before snapshots is marked unverifiable and offers no verify button', async () => {
    renderPage();

    const legacy = await rowOf(0);
    expect(within(legacy).getByText('provablyFair.legacy')).toBeInTheDocument();
    expect(within(legacy).queryByRole('button')).toBeNull();

    const snapshot = await rowOf(1);
    expect(within(snapshot).getByText('provablyFair.verifiable')).toBeInTheDocument();
});

test('verifying from history sends the open id and reports that seed and result match', async () => {
    api.verifyOpen.mockResolvedValue({
        data: {
            itemId: 10, color: 'default', rarity: 'Factory New', source: 'snapshot', seedMatches: true, matchesRecord: true,
        },
    });
    renderPage();

    fireEvent.click(within(await rowOf(1)).getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    await waitFor(() => expect(api.verifyOpen).toHaveBeenCalledWith({
        serverSeed: 'server', clientSeed: 'client', nonce: 1, caseId: 'dust2', openId: 5,
    }));
    expect(await screen.findByText('provablyFair.seedMatches')).toBeInTheDocument();
    expect(screen.getByText('provablyFair.matchesRecord')).toBeInTheDocument();
});

test('a result that does not match the recorded drop is reported as such', async () => {
    api.verifyOpen.mockResolvedValue({
        data: {
            itemId: 99, color: 'default', rarity: 'Factory New', source: 'snapshot', seedMatches: false, matchesRecord: false,
        },
    });
    renderPage();

    fireEvent.click(within(await rowOf(1)).getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    expect(await screen.findByText('provablyFair.seedMismatch')).toBeInTheDocument();
    expect(screen.getByText('provablyFair.mismatchRecord')).toBeInTheDocument();
});

test('editing the case id by hand drops the open id and verifies against the current case', async () => {
    api.verifyOpen.mockResolvedValue({
 data: {
 itemId: 10, color: 'default', rarity: 'Factory New', source: 'current',
},
});
    renderPage();

    fireEvent.click(within(await rowOf(1)).getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.change(screen.getByPlaceholderText('provablyFair.caseIdPlaceholder'), { target: { value: 'train' } });
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    await waitFor(() => expect(api.verifyOpen).toHaveBeenCalledWith({
        serverSeed: 'server', clientSeed: 'client', nonce: 1, caseId: 'train',
    }));
    expect(await screen.findByText(/provablyFair.computed/)).toBeInTheDocument();
    expect(screen.queryByText('provablyFair.matchesRecord')).toBeNull();
});

test('an old open that the current case still reproduces can be verified against it', async () => {
    api.verifyOpen.mockResolvedValue({
 data: {
 itemId: 12, color: 'default', rarity: 'Factory New', source: 'current',
},
});
    renderPage();

    const row = await rowOf(7);
    expect(within(row).getByText('provablyFair.verifiableCurrent')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    await waitFor(() => expect(api.verifyOpen).toHaveBeenCalledWith({
        serverSeed: 'server', clientSeed: 'client', nonce: 7, caseId: 'train',
    }));
});

test('editing the nonce or seeds by hand drops the open id', async () => {
    api.verifyOpen.mockResolvedValue({
 data: {
 itemId: 10, color: 'default', rarity: 'Factory New', source: 'current',
},
});
    renderPage();

    fireEvent.click(within(await rowOf(1)).getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.change(screen.getByPlaceholderText('provablyFair.noncePlaceholder'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    await waitFor(() => expect(api.verifyOpen).toHaveBeenCalledWith({
        serverSeed: 'server', clientSeed: 'client', nonce: 2, caseId: 'dust2',
    }));
});

test('when the server cannot tell whether an old open replays, the row says so and still offers a check', async () => {
    api.getOpenHistory.mockResolvedValue({ data: [{ ...ROWS[2], verification: 'unknown' }] });
    api.verifyOpen.mockResolvedValue({
 data: {
 itemId: 12, color: 'default', rarity: 'Factory New', source: 'current',
},
});
    renderPage();

    const row = await rowOf(7);
    expect(within(row).getByText('provablyFair.verificationUnknown')).toBeInTheDocument();
    expect(within(row).queryByText('provablyFair.legacy')).toBeNull();
    fireEvent.click(within(row).getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    await waitFor(() => expect(api.verifyOpen).toHaveBeenCalled());
});

test('the client seed is sent exactly as recorded, surrounding spaces included', async () => {
    api.getOpenHistory.mockResolvedValue({ data: [{ ...ROWS[0], clientSeed: ' lucky ' }] });
    api.verifyOpen.mockResolvedValue({
        data: {
            itemId: 10, color: 'default', rarity: 'Factory New', source: 'snapshot', seedMatches: true, matchesRecord: true,
        },
    });
    renderPage();

    await screen.findByText('dust2');
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    await waitFor(() => expect(api.verifyOpen).toHaveBeenCalledWith(expect.objectContaining({ clientSeed: ' lucky ' })));
});

test('an unknown old open whose seed is not revealed yet says it awaits a rotation', async () => {
    api.getOpenHistory.mockResolvedValue({ data: [{ ...ROWS[2], verification: 'unknown', revealedServerSeed: null }] });
    renderPage();

    const row = await rowOf(7);
    expect(within(row).getByText('provablyFair.awaitingRotate')).toBeInTheDocument();
    expect(within(row).queryByText('provablyFair.verificationUnknown')).toBeNull();
});

test('a verification the server refuses keeps the hint about the inputs', async () => {
    api.verifyOpen.mockRejectedValue({ error: 422, message: 'Такого відкриття не існує' });
    renderPage();

    fireEvent.click(within(await rowOf(1)).getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    expect(await screen.findByText('provablyFair.verifyFailed')).toBeInTheDocument();
    expect(openNotification).not.toHaveBeenCalled();
});

test('a verification the server cannot run is reported once, under the calculator', async () => {
    api.verifyOpen.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPage();

    fireEvent.click(within(await rowOf(1)).getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    expect(await screen.findByText('common.serverError')).toBeInTheDocument();
    expect(openNotification).not.toHaveBeenCalled();
});

test('a verification that finishes after the page closed sets no state', async () => {
    const verification = deferred();
    api.verifyOpen.mockReturnValue(verification.promise);
    const { unmount } = renderNamedPage();
    fireEvent.click(within(await rowOf(1)).getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    const updatesAfterUnmount = await settleAfterUnmount(unmount, verification, {
        data: {
            itemId: 10, color: 'default', rarity: 'Factory New', source: 'snapshot', seedMatches: true, matchesRecord: true,
        },
    });

    expect(updatesAfterUnmount).toBe(0);
});

const computeFromFirstRow = async () => {
    fireEvent.click(within(await rowOf(1)).getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.change(screen.getByPlaceholderText('provablyFair.caseIdPlaceholder'), { target: { value: 'train' } });
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));
};

test('the computed result names its item and, while the item is unknown, the grade it was drawn from', async () => {
    api.verifyOpen.mockResolvedValue({
        data: {
            itemId: 99, color: 'default', rarity: 'covert', source: 'current',
        },
    });
    renderPage();

    await computeFromFirstRow();

    expect(await screen.findByText(/provablyFair\.computed: .*99.* — grade\.covert$/)).toBeInTheDocument();
});

test('an old open shows the grade of its item, not the wear bucket it was drawn from', async () => {
    api.verifyOpen.mockResolvedValue({
        data: {
            itemId: 12, color: 'painted', rarity: 'Factory New', source: 'current',
        },
    });
    renderPage();

    await computeFromFirstRow();

    const result = await screen.findByText('provablyFair.computed: Butterfly Knife | Fade — grade.special');
    expect(result.querySelector('.item-color')).not.toBeNull();
    expect(screen.queryByText(/Factory New/)).toBeNull();
});

test('the opens history names each dropped item and marks a painted one', async () => {
    api.getOpenHistory.mockResolvedValue({ data: [{ ...ROWS[0], resultColor: 'painted' }, ROWS[1], ROWS[2]] });
    renderPage();

    const painted = await rowOf(1);
    expect(await within(painted).findByText('Nova | Rising Sun')).toBeInTheDocument();
    expect(painted.querySelector('.item-color')).not.toBeNull();
    const plain = await rowOf(0);
    expect(within(plain).getByText('AWP | Worm God')).toBeInTheDocument();
    expect(plain.querySelector('.item-color')).toBeNull();
    expect(getItemsInfo).toHaveBeenCalledTimes(1);
});

test('a guest gets the algorithm and the calculator without asking for seeds or history', async () => {
    api.verifyOpen.mockResolvedValue({
        data: {
            itemId: 10, color: 'default', rarity: 'milspec', source: 'current',
        },
    });
    renderPage({});

    expect(screen.getByText('provablyFair.algorithm')).toBeInTheDocument();
    expect(screen.getByText('provablyFair.loginCta')).toBeInTheDocument();
    expect(screen.queryByText('provablyFair.currentSeeds')).toBeNull();
    expect(screen.queryByText('provablyFair.history')).toBeNull();
    expect(api.getProvablyFairState).not.toHaveBeenCalled();
    expect(api.getOpenHistory).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('provablyFair.serverSeedPlaceholder'), { target: { value: 'server' } });
    fireEvent.change(screen.getByPlaceholderText('provablyFair.clientSeedPlaceholder'), { target: { value: 'client' } });
    fireEvent.change(screen.getByPlaceholderText('provablyFair.noncePlaceholder'), { target: { value: '3' } });
    fireEvent.change(screen.getByPlaceholderText('provablyFair.caseIdPlaceholder'), { target: { value: 'dust2' } });
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    await waitFor(() => expect(api.verifyOpen).toHaveBeenCalledWith({
        serverSeed: 'server', clientSeed: 'client', nonce: 3, caseId: 'dust2',
    }));
    expect(await screen.findByText(/provablyFair\.computed/)).toBeInTheDocument();
});

test('a guest who signs in from the page comes back to it', async () => {
    renderPage({});

    fireEvent.click(screen.getByRole('button', { name: 'menu.login' }));

    expect(await screen.findByText('login page {"goBack":true}')).toBeInTheDocument();
});

test('a player who opens the page before the session check ends gets their seeds and opens once it ends', async () => {
    const { store } = renderPage(undefined, usersReducer);
    expect(screen.getByText('provablyFair.loginCta')).toBeInTheDocument();
    expect(api.getProvablyFairState).not.toHaveBeenCalled();

    act(() => { store.dispatch({ type: LOGIN_USER, payloadUser: { user_id: 1, user_login: 'player' } }); });

    expect(await screen.findByText('hash')).toBeInTheDocument();
    expect(await screen.findAllByText('dust2')).toHaveLength(2);
    expect(screen.queryByText('provablyFair.loginCta')).toBeNull();
    expect(api.getProvablyFairState).toHaveBeenCalledTimes(1);
    expect(api.getOpenHistory).toHaveBeenCalledTimes(1);
});

test('while a player\'s seeds load, the algorithm and the calculator are already there', async () => {
    api.getProvablyFairState.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText('provablyFair.algorithm')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'provablyFair.compute' })).toBeInTheDocument();
    expect(screen.queryByText('provablyFair.currentSeeds')).toBeNull();
    expect(screen.queryByText('provablyFair.loginCta')).toBeNull();
});

test('a check stopped by the limiter says so instead of blaming the inputs', async () => {
    api.verifyOpen.mockRejectedValue({ error: 429, message: 'Забагато перевірок. Зачекайте трохи.' });
    renderPage({});

    fireEvent.change(screen.getByPlaceholderText('provablyFair.serverSeedPlaceholder'), { target: { value: 'server' } });
    fireEvent.change(screen.getByPlaceholderText('provablyFair.clientSeedPlaceholder'), { target: { value: 'client' } });
    fireEvent.change(screen.getByPlaceholderText('provablyFair.noncePlaceholder'), { target: { value: '3' } });
    fireEvent.change(screen.getByPlaceholderText('provablyFair.caseIdPlaceholder'), { target: { value: 'dust2' } });
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    expect(await screen.findByText('Забагато перевірок. Зачекайте трохи.')).toBeInTheDocument();
    expect(screen.queryByText('provablyFair.verifyFailed')).toBeNull();
});

test('a check refused as too many without a reason still says something went wrong', async () => {
    api.verifyOpen.mockRejectedValue({ error: 429 });
    renderPage({});

    fireEvent.change(screen.getByPlaceholderText('provablyFair.serverSeedPlaceholder'), { target: { value: 'server' } });
    fireEvent.change(screen.getByPlaceholderText('provablyFair.clientSeedPlaceholder'), { target: { value: 'client' } });
    fireEvent.change(screen.getByPlaceholderText('provablyFair.noncePlaceholder'), { target: { value: '3' } });
    fireEvent.change(screen.getByPlaceholderText('provablyFair.caseIdPlaceholder'), { target: { value: 'dust2' } });
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    expect(await screen.findByText('common.serverError')).toBeInTheDocument();
    expect(screen.queryByText('provablyFair.verifyFailed')).toBeNull();
});

test('the client seed field stops at the 64 characters the server keeps', async () => {
    renderPage();

    expect(await screen.findByDisplayValue('client')).toHaveAttribute('maxlength', '64');
});
