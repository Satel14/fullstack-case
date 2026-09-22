import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
