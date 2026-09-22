import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BalanceModal from './BalanceModal';

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

test('confirm is present but disabled until review is pressed', () => {
    render(<BalanceModal user={target} visible onClose={() => {}} onDone={() => {}} />);

    fireEvent.change(screen.getByLabelText('admin.balance.delta'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('admin.balance.reason'), { target: { value: 'бонус' } });

    const confirm = screen.getByRole('button', { name: 'admin.balance.confirm' });
    expect(confirm).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'admin.balance.review' }));
    expect(confirm).not.toBeDisabled();
});
