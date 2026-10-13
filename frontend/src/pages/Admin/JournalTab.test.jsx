import React from 'react';
import {
    render, screen, waitFor, fireEvent,
} from '@testing-library/react';
import JournalTab from './JournalTab';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../api/all/admin', () => ({
    getAdminActions: jest.fn(),
}));

const { getAdminActions } = require('../../api/all/admin');

beforeEach(() => {
    getAdminActions.mockReset();
});

test('a failed load is reported instead of an empty log', async () => {
    getAdminActions.mockRejectedValue({ error: 500 });

    render(<JournalTab />);

    await waitFor(() => expect(screen.getAllByText('admin.journal.loadFailed').length).toBeGreaterThan(0));
    expect(screen.queryByText('admin.journal.empty')).toBeNull();
});

test('an empty log is not reported as a failure', async () => {
    getAdminActions.mockResolvedValue({ data: [] });

    render(<JournalTab />);

    await waitFor(() => expect(screen.getByText('admin.journal.empty')).toBeInTheDocument());
    expect(screen.queryByText('admin.journal.loadFailed')).toBeNull();
});

test('becoming the active tab refetches the log', async () => {
    getAdminActions.mockResolvedValue({ data: [] });

    const { rerender } = render(<JournalTab active={false} />);
    expect(getAdminActions).not.toHaveBeenCalled();

    rerender(<JournalTab active />);
    await waitFor(() => expect(getAdminActions).toHaveBeenCalledTimes(1));

    rerender(<JournalTab active={false} />);
    rerender(<JournalTab active />);
    await waitFor(() => expect(getAdminActions).toHaveBeenCalledTimes(2));
});

test('re-rendering does not refetch, and turning a page fetches only that page', async () => {
    const fullPage = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1, created_at: '', adminId: 1, action: 'balance', targetType: 'user', targetId: i, reason: '', payload: null,
    }));
    getAdminActions.mockResolvedValue({ data: fullPage });

    const { rerender } = render(<JournalTab active />);
    const secondPage = await screen.findByTitle('2');
    rerender(<JournalTab active />);
    expect(getAdminActions).toHaveBeenCalledTimes(1);
    expect(getAdminActions).toHaveBeenCalledWith({ limit: 20, offset: 0 });

    fireEvent.click(secondPage);
    await screen.findByTitle('3');

    expect(getAdminActions).toHaveBeenCalledTimes(2);
    expect(getAdminActions).toHaveBeenLastCalledWith({ limit: 20, offset: 20 });
});
