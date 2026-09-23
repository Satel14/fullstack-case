import React from 'react';
import {
    render, screen, fireEvent, waitFor, within,
} from '@testing-library/react';
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

const api = require('../api/all/provablyFair');

const ROWS = [
    {
        id: 5, caseId: 'dust2', nonce: 1, clientSeed: 'client', resultItemId: 10, resultColor: 'default',
        revealedServerSeed: 'server', hasSnapshot: true, verification: 'snapshot',
    },
    {
        id: 4, caseId: 'dust2', nonce: 0, clientSeed: 'client', resultItemId: 11, resultColor: 'default',
        revealedServerSeed: 'server', hasSnapshot: false, verification: 'none',
    },
    {
        id: 3, caseId: 'train', nonce: 7, clientSeed: 'client', resultItemId: 12, resultColor: 'default',
        revealedServerSeed: 'server', hasSnapshot: false, verification: 'current',
    },
];

beforeEach(() => {
    api.getProvablyFairState.mockResolvedValue({
        data: { active: { serverSeedHash: 'hash', nonce: 2, clientSeed: 'client' }, previous: null },
    });
    api.getOpenHistory.mockResolvedValue({ data: ROWS });
    api.verifyOpen.mockReset();
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
    api.verifyOpen.mockResolvedValue({ data: { itemId: 10, color: 'default', rarity: 'Factory New', source: 'current' } });
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
    api.verifyOpen.mockResolvedValue({ data: { itemId: 12, color: 'default', rarity: 'Factory New', source: 'current' } });
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
    api.verifyOpen.mockResolvedValue({ data: { itemId: 10, color: 'default', rarity: 'Factory New', source: 'current' } });
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
    api.verifyOpen.mockResolvedValue({ data: { itemId: 12, color: 'default', rarity: 'Factory New', source: 'current' } });
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
