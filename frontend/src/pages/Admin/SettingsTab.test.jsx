import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import SettingsTab from './SettingsTab';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../api/all/admin', () => ({
    getSaleRate: jest.fn(),
    updateSaleRate: jest.fn(),
}));

jest.mock('../../components/mini/openNotification', () => jest.fn());

const { getSaleRate, updateSaleRate } = require('../../api/all/admin');
const openNotification = require('../../components/mini/openNotification');

const rateInput = () => screen.getByLabelText('admin.settings.saleRate');

beforeEach(() => {
    getSaleRate.mockReset();
    updateSaleRate.mockReset();
    openNotification.mockReset();
    getSaleRate.mockResolvedValue({ data: { rate: 1 } });
});

test('the current sale rate is shown and a new one is saved with its reason', async () => {
    updateSaleRate.mockResolvedValue({ data: { rate: 0.9 } });
    render(<SettingsTab />);

    await waitFor(() => expect(rateInput().value).toBe('1.0000'));
    fireEvent.change(rateInput(), { target: { value: '0.9' } });
    fireEvent.change(screen.getByLabelText('admin.settings.reason'), { target: { value: 'selling fee' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.save' }));

    await waitFor(() => expect(updateSaleRate).toHaveBeenCalledWith(0.9, 'selling fee'));
    expect(openNotification).toHaveBeenCalledWith('success', 'admin.settings.saved', '0.9');
});

test('nothing is sent while the rate is not a number between 0 and 1', async () => {
    render(<SettingsTab />);
    await waitFor(() => expect(rateInput().value).toBe('1.0000'));

    fireEvent.change(rateInput(), { target: { value: '' } });

    expect(screen.getByRole('button', { name: 'admin.save' })).toBeDisabled();
    expect(updateSaleRate).not.toHaveBeenCalled();
});

test('a refused save shows the reason the server gave', async () => {
    const reason = 'Перевірте введені дані';
    updateSaleRate.mockRejectedValue({ error: 422, message: reason });
    render(<SettingsTab />);
    await waitFor(() => expect(rateInput().value).toBe('1.0000'));

    fireEvent.change(rateInput(), { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.save' }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'admin.settings.saveFailed', reason));
});

test('a rate that cannot be loaded says so and offers nothing to save', async () => {
    getSaleRate.mockRejectedValue({ error: 500 });
    render(<SettingsTab />);

    expect(await screen.findByText('admin.settings.loadFailed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'admin.save' })).toBeNull();
});

test('a rate typed with more than four decimals is rounded to four, so it can still be saved', async () => {
    updateSaleRate.mockResolvedValue({ data: { rate: 0.1235 } });
    render(<SettingsTab />);
    await waitFor(() => expect(rateInput().value).toBe('1.0000'));

    fireEvent.change(rateInput(), { target: { value: '0.12345' } });
    fireEvent.blur(rateInput());
    fireEvent.click(screen.getByRole('button', { name: 'admin.save' }));

    await waitFor(() => expect(updateSaleRate).toHaveBeenCalled());
    const [sent] = updateSaleRate.mock.calls[0];
    expect(String(sent)).toMatch(/^0\.\d{1,4}$/);
});
