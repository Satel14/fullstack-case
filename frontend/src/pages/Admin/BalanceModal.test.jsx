import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { notification } from 'antd';
import BalanceModal from './BalanceModal';

afterEach(() => { notification.destroy(); });

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../api/all/admin', () => ({
    adjustUserBalance: jest.fn(() => Promise.resolve({ status: 200, balance: 0 })),
}));

const target = { user_id: 2, user_login: 'target', user_balance: '100.00' };

test('the confirm button is disabled until a delta and a reason are present', () => {
    render(<BalanceModal user={target} visible onClose={() => {}} onDone={() => {}} />);

    const confirm = screen.getByRole('button', { name: 'admin.balance.review' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('admin.balance.delta'), { target: { value: '25.5' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('admin.balance.reason'), { target: { value: '   ' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('admin.balance.reason'), { target: { value: 'компенсація' } });
    expect(confirm).not.toBeDisabled();
});

test('a delta of zero or more than two decimals is refused', () => {
    render(<BalanceModal user={target} visible onClose={() => {}} onDone={() => {}} />);

    fireEvent.change(screen.getByLabelText('admin.balance.reason'), { target: { value: 'причина' } });
    const confirm = screen.getByRole('button', { name: 'admin.balance.review' });

    fireEvent.change(screen.getByLabelText('admin.balance.delta'), { target: { value: '0' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('admin.balance.delta'), { target: { value: '0.005' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('admin.balance.delta'), { target: { value: '-25.50' } });
    expect(confirm).not.toBeDisabled();
});

test('submitting requires passing through the confirmation step', async () => {
    const { adjustUserBalance } = require('../../api/all/admin');
    render(<BalanceModal user={target} visible onClose={() => {}} onDone={() => {}} />);

    fireEvent.change(screen.getByLabelText('admin.balance.delta'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('admin.balance.reason'), { target: { value: 'бонус' } });

    expect(adjustUserBalance).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'admin.balance.review' }));
    expect(adjustUserBalance).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'admin.balance.confirm' }));
    expect(adjustUserBalance).toHaveBeenCalledWith(2, 10, 'бонус');
});

test('a comma decimal is accepted and sent as a dot decimal', async () => {
    const { adjustUserBalance } = require('../../api/all/admin');
    render(<BalanceModal user={target} visible onClose={() => {}} onDone={() => {}} />);

    fireEvent.change(screen.getByLabelText('admin.balance.delta'), { target: { value: '1,5' } });
    fireEvent.change(screen.getByLabelText('admin.balance.reason'), { target: { value: 'причина' } });

    fireEvent.click(screen.getByRole('button', { name: 'admin.balance.review' }));
    fireEvent.click(screen.getByRole('button', { name: 'admin.balance.confirm' }));

    await waitFor(() => expect(adjustUserBalance).toHaveBeenCalledWith(2, 1.5, 'причина'));
});

test('an amount with a thousands separator or in a non-decimal notation is refused', () => {
    render(<BalanceModal user={target} visible onClose={() => {}} onDone={() => {}} />);

    fireEvent.change(screen.getByLabelText('admin.balance.reason'), { target: { value: 'причина' } });
    const review = screen.getByRole('button', { name: 'admin.balance.review' });
    const delta = screen.getByLabelText('admin.balance.delta');

    for (const value of ['1,000', '1.000', '-2,500', '1,000.50', '1 000', '1e3', '0x10', '.5', '5.', '--5']) {
        fireEvent.change(delta, { target: { value } });
        expect(review).toBeDisabled();
        expect(screen.getByText('admin.balance.deltaInvalid')).toBeInTheDocument();
    }

    for (const value of ['1000', '+10', '-3,25', ' 12.5 ', '0,01']) {
        fireEvent.change(delta, { target: { value } });
        expect(review).not.toBeDisabled();
    }
});

test('an unusable amount is explained instead of only greying the button', () => {
    render(<BalanceModal user={target} visible onClose={() => {}} onDone={() => {}} />);

    expect(screen.queryByText('admin.balance.deltaInvalid')).toBeNull();

    fireEvent.change(screen.getByLabelText('admin.balance.delta'), { target: { value: '1.005' } });
    expect(screen.getByText('admin.balance.deltaInvalid')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('admin.balance.delta'), { target: { value: '1.5' } });
    expect(screen.queryByText('admin.balance.deltaInvalid')).toBeNull();

    fireEvent.change(screen.getByLabelText('admin.balance.reason'), { target: { value: '   ' } });
    expect(screen.getByText('admin.balance.reasonRequired')).toBeInTheDocument();
});

test('confirm is present but disabled until review is pressed', () => {
    render(<BalanceModal user={target} visible onClose={() => {}} onDone={() => {}} />);

    fireEvent.change(screen.getByLabelText('admin.balance.delta'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('admin.balance.reason'), { target: { value: 'бонус' } });

    const confirm = screen.getByRole('button', { name: 'admin.balance.confirm' });
    expect(confirm).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'admin.balance.review' }));
    expect(confirm).not.toBeDisabled();
});
