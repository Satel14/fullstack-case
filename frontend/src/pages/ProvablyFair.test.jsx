import React from 'react';
import {
    render, screen, fireEvent, waitFor, within,
} from '@testing-library/react';
import { Modal } from 'antd';
import ProvablyFair from './ProvablyFair';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
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

const api = require('../api/all/provablyFair');
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
});

afterEach(() => {
    Modal.destroyAll();
});

test('seeds that cannot be loaded leave an error with a retry instead of a blank page', async () => {
    api.getProvablyFairState.mockRejectedValueOnce({ error: 500 });
    render(<ProvablyFair />);

    expect(await screen.findByText('provablyFair.loadFailed')).toBeInTheDocument();
    expect(api.getOpenHistory).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /provablyFair\.retry/ }));

    expect(await screen.findByText('hash')).toBeInTheDocument();
    expect(await screen.findAllByText('dust2')).toHaveLength(2);
    expect(screen.queryByText('provablyFair.loadFailed')).toBeNull();
});

test('a history that cannot be loaded is shown as an error, not as an empty table, and can be retried', async () => {
    api.getOpenHistory.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { container } = render(<ProvablyFair />);

    expect(await screen.findByText('provablyFair.historyFailed')).toBeInTheDocument();
    expect(screen.getByText('hash')).toBeInTheDocument();
    expect(container.querySelector('.ant-table')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /provablyFair\.retry/ }));

    expect(await screen.findAllByText('dust2')).toHaveLength(2);
    expect(screen.queryByText('provablyFair.historyFailed')).toBeNull();
});

const saveClientSeed = async (value) => {
    render(<ProvablyFair />);
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
    render(<ProvablyFair />);
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

const opensFrom = (firstId, count) => Array.from({ length: count }, (_, i) => ({
    ...ROWS[0], id: firstId - i, nonce: firstId - i, caseId: `case-${firstId - i}`,
}));

test('older opens beyond the first page are reached with "load more"', async () => {
    api.getOpenHistory
        .mockResolvedValueOnce({ data: opensFrom(60, 50) })
        .mockResolvedValueOnce({ data: opensFrom(10, 10) });
    render(<ProvablyFair />);

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
    render(<ProvablyFair />);
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
    render(<ProvablyFair />);
    await screen.findByText('case-71');

    server.opens = [...opensFrom(180, 60), ...server.opens];

    await pressLoadMoreUntil('case-31');
    await pressLoadMoreUntil('case-1');

    expect(shownCases()).toEqual(opensFrom(120, 120).map((open) => open.caseId));
    expect(screen.queryByRole('button', { name: /provablyFair\.loadMore/ })).toBeNull();
});

test('"load more" still reaches the older opens when exactly a page of new opens pushed the shown ones down', async () => {
    const server = serveHistory(opensFrom(80, 80));
    render(<ProvablyFair />);
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
    render(<ProvablyFair />);
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
    render(<ProvablyFair />);

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
    render(<ProvablyFair />);

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
    render(<ProvablyFair />);

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
    render(<ProvablyFair />);

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
    render(<ProvablyFair />);

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
    render(<ProvablyFair />);

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
    render(<ProvablyFair />);

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
    render(<ProvablyFair />);

    await screen.findByText('dust2');
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    await waitFor(() => expect(api.verifyOpen).toHaveBeenCalledWith(expect.objectContaining({ clientSeed: ' lucky ' })));
});

test('an unknown old open whose seed is not revealed yet says it awaits a rotation', async () => {
    api.getOpenHistory.mockResolvedValue({ data: [{ ...ROWS[2], verification: 'unknown', revealedServerSeed: null }] });
    render(<ProvablyFair />);

    const row = await rowOf(7);
    expect(within(row).getByText('provablyFair.awaitingRotate')).toBeInTheDocument();
    expect(within(row).queryByText('provablyFair.verificationUnknown')).toBeNull();
});

test('a verification the server refuses keeps the hint about the inputs', async () => {
    api.verifyOpen.mockRejectedValue({ error: 422, message: 'Такого відкриття не існує' });
    render(<ProvablyFair />);

    fireEvent.click(within(await rowOf(1)).getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    expect(await screen.findByText('provablyFair.verifyFailed')).toBeInTheDocument();
    expect(openNotification).not.toHaveBeenCalled();
});

test('a verification the server cannot run is reported once, under the calculator', async () => {
    api.verifyOpen.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<ProvablyFair />);

    fireEvent.click(within(await rowOf(1)).getByRole('button', { name: 'provablyFair.verify' }));
    fireEvent.click(screen.getByRole('button', { name: 'provablyFair.compute' }));

    expect(await screen.findByText('common.serverError')).toBeInTheDocument();
    expect(openNotification).not.toHaveBeenCalled();
});
