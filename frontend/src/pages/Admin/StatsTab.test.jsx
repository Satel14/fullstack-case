import React from 'react';
import {
    render, screen, fireEvent, waitFor, within, act,
} from '@testing-library/react';
import StatsTab from './StatsTab';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, params) => (key === 'admin.stats.percent' ? `${params.value}%` : key),
    }),
}));

jest.mock('../../api/all/admin', () => ({ getAdminStats: jest.fn() }));

const { getAdminStats } = require('../../api/all/admin');

const report = {
    period: { from: '2026-10-01T00:00:00.000Z', to: '2026-11-01T00:00:00.000Z' },
    totals: {
        opens: 3,
        spent: '400.20',
        valueGiven: '275.40',
        realizedEdge: '0.311844',
        sales: '12.35',
        deposits: '123.45',
        bonuses: '50.25',
        promocodes: '7.89',
        adminCorrections: '-17.25',
        withdrawalsCompleted: 1,
        unvaluedOpens: 0,
    },
    cases: [
        {
            caseId: 'dust2',
            title: 'Dust II',
            opens: 2,
            spent: '100.00',
            valueGiven: '75.25',
            realizedEdge: '0.247500',
            expectedEdge: '0.150000',
            unpricedOpens: 0,
        },
        {
            caseId: 'havoc',
            title: 'Havoc',
            opens: 1,
            spent: '300.20',
            valueGiven: '200.15',
            realizedEdge: '-0.333278',
            expectedEdge: null,
            unpricedOpens: 0,
        },
    ],
};

beforeEach(() => {
    getAdminStats.mockReset();
    getAdminStats.mockResolvedValue({ data: report });
});

const figure = (key) => screen.getByText(`admin.stats.${key}`, { selector: 'dt' }).nextElementSibling;
const loadButton = () => screen.getByRole('button', { name: 'admin.stats.apply' });

test('the default request shows turnover, signed credit flows, completed withdrawals and real edge', async () => {
    render(<StatsTab />);
    await screen.findByText('Dust II');
    expect(getAdminStats).toHaveBeenCalledWith({});
    Object.entries(report.totals)
        .filter(([field]) => field !== 'unvaluedOpens' && field !== 'realizedEdge')
        .forEach(([key, value]) => expect(figure(key)).toHaveTextContent(String(value)));
    expect(figure('realizedEdge')).toHaveTextContent('31.18%');
    expect(screen.getByLabelText('admin.stats.from')).toHaveValue('2026-10-01');
    expect(screen.getByLabelText('admin.stats.to')).toHaveValue('2026-10-31');
    expect(screen.getByText('admin.stats.valueHint')).toBeInTheDocument();
    expect(screen.getByText('admin.stats.expectedHint')).toBeInTheDocument();
});

test('per-case rows show value, observed and expected edge and sort numerically by spend and edge', async () => {
    render(<StatsTab />);
    const caseRow = (await screen.findByText('Dust II')).closest('tr');
    expect(within(caseRow).getByText(/100.00/)).toBeInTheDocument();
    expect(within(caseRow).getByText(/75.25/)).toBeInTheDocument();
    expect(within(caseRow).getByText('24.75%')).toBeInTheDocument();
    expect(within(caseRow).getByText('15.00%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('columnheader', { name: /admin.stats.spent/ }));
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Dust II');
    fireEvent.click(screen.getByRole('columnheader', { name: /admin.stats.spent/ }));
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Havoc');
    fireEvent.click(screen.getByRole('columnheader', { name: /admin.stats.realizedEdge/ }));
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Havoc');
    expect(screen.getByText('-33.33%')).toBeInTheDocument();
});

test('both selected UTC calendar days are included and a new period replaces the old figures', async () => {
    render(<StatsTab />);
    await screen.findByText('Dust II');
    getAdminStats.mockResolvedValue({ data: { ...report, totals: { ...report.totals, spent: '10.01' }, cases: [] } });
    fireEvent.change(screen.getByLabelText('admin.stats.from'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('admin.stats.to'), { target: { value: '2026-09-02' } });
    fireEvent.click(loadButton());
    await waitFor(() => expect(getAdminStats).toHaveBeenLastCalledWith({
        from: '2026-09-01T00:00:00.000Z', to: '2026-09-03T00:00:00.000Z',
    }));
    await waitFor(() => expect(figure('spent')).toHaveTextContent('10.01'));
    expect(screen.queryByText('Dust II')).not.toBeInTheDocument();
});

test('spend sorting and display preserve minor units beyond JavaScript number precision', async () => {
    getAdminStats.mockResolvedValue({
        data: {
            ...report,
            cases: [
                { ...report.cases[0], spent: '900719925474099.02' },
                { ...report.cases[1], spent: '900719925474099.01' },
            ],
        },
    });
    render(<StatsTab />);
    await screen.findByText('Dust II');
    expect(screen.getByText(/900719925474099.02/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('columnheader', { name: /admin.stats.spent/ }));
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Havoc');
});

test('missing, reversed and more than 365 day periods disable the request', async () => {
    render(<StatsTab />);
    await screen.findByText('Dust II');
    const from = screen.getByLabelText('admin.stats.from');
    const to = screen.getByLabelText('admin.stats.to');
    fireEvent.change(from, { target: { value: '' } });
    expect(loadButton()).toBeDisabled();
    fireEvent.change(from, { target: { value: '2026-11-02' } });
    expect(loadButton()).toBeDisabled();
    fireEvent.change(from, { target: { value: '2025-01-01' } });
    fireEvent.change(to, { target: { value: '2026-01-01' } });
    expect(loadButton()).toBeDisabled();
    fireEvent.change(to, { target: { value: '2025-12-31' } });
    expect(loadButton()).toBeEnabled();
    expect(getAdminStats).toHaveBeenCalledTimes(1);
});

test('an in-flight request shows loading without fabricated zero figures or another enabled request', async () => {
    getAdminStats.mockReturnValue(new Promise(() => {}));
    render(<StatsTab />);
    expect(screen.getByRole('status')).toHaveTextContent('admin.stats.loading');
    expect(loadButton()).toBeDisabled();
    expect(screen.queryByText('admin.stats.spent', { selector: 'dt' })).not.toBeInTheDocument();
});

test('an initial failure says loading failed and retry recovers the report', async () => {
    getAdminStats.mockRejectedValueOnce({ error: 500 });
    render(<StatsTab />);
    expect(await screen.findByText('admin.stats.loadFailed')).toBeInTheDocument();
    expect(screen.queryByText('admin.stats.spent', { selector: 'dt' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'admin.stats.retry' }));
    await screen.findByText('Dust II');
    expect(screen.queryByText('admin.stats.loadFailed')).not.toBeInTheDocument();
});

test('a failed refresh removes stale totals and says why instead of showing zeros', async () => {
    render(<StatsTab />);
    await screen.findByText('Dust II');
    getAdminStats.mockRejectedValueOnce({ error: 422, message: 'Invalid period' });
    fireEvent.click(loadButton());
    expect(await screen.findByText('admin.stats.loadFailed')).toBeInTheDocument();
    expect(screen.getByText('Invalid period')).toBeInTheDocument();
    expect(screen.queryByText('Dust II')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.stats.spent', { selector: 'dt' })).not.toBeInTheDocument();
});

test('zero turnover keeps edge unavailable and an empty case list is an explicit successful result', async () => {
    getAdminStats.mockResolvedValue({
        data: {
            ...report,
            totals: {
                ...report.totals, opens: 0, spent: '0.00', valueGiven: '0.00', realizedEdge: null,
            },
            cases: [],
        },
    });
    render(<StatsTab />);
    expect(await screen.findByText('admin.stats.empty')).toBeInTheDocument();
    expect(figure('spent')).toHaveTextContent('0.00');
    expect(figure('realizedEdge')).toHaveTextContent('admin.stats.noData');
    expect(screen.queryByText('admin.stats.loadFailed')).not.toBeInTheDocument();
});

test('incomplete snapshots and legacy spend are identified and rendered as unavailable', async () => {
    getAdminStats.mockResolvedValue({
        data: {
            ...report,
            totals: {
                ...report.totals, valueGiven: null, realizedEdge: null, unvaluedOpens: 2,
            },
            cases: [{
                ...report.cases[0], spent: null, valueGiven: null, realizedEdge: null, unpricedOpens: 1,
            }],
        },
    });
    render(<StatsTab />);
    await screen.findByText('Dust II');
    expect(figure('valueGiven')).toHaveTextContent('admin.stats.noData');
    expect(figure('realizedEdge')).toHaveTextContent('admin.stats.noData');
    expect(screen.getByText('admin.stats.incompleteValues')).toBeInTheDocument();
    expect(screen.getByText('admin.stats.incompleteSpend')).toBeInTheDocument();
    const row = screen.getByText('Dust II').closest('tr');
    expect(within(row).getAllByText('admin.stats.noData')).toHaveLength(3);
});

test('inactive stats do not query, and a response after leaving the tab does not replace a later period', async () => {
    let finish;
    getAdminStats.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const { rerender } = render(<StatsTab active={false} />);
    expect(getAdminStats).not.toHaveBeenCalled();
    rerender(<StatsTab active />);
    expect(getAdminStats).toHaveBeenCalledTimes(1);
    rerender(<StatsTab active={false} />);
    rerender(<StatsTab active />);
    await screen.findByText('Dust II');
    await act(async () => finish({ data: { ...report, cases: [{ ...report.cases[0], title: 'Stale case' }] } }));
    expect(screen.queryByText('Stale case')).not.toBeInTheDocument();
    expect(screen.getByText('Dust II')).toBeInTheDocument();
});
