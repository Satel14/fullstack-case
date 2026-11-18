import React from 'react';
import {
    render, screen, fireEvent, waitFor, within,
} from '@testing-library/react';
import PromocodesTab from './PromocodesTab';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }),
}));

jest.mock('../../api/all/admin', () => ({
    getAdminPromocodes: jest.fn(),
    createAdminPromocode: jest.fn(),
    updateAdminPromocode: jest.fn(),
}));

jest.mock('../../components/mini/openNotification', () => jest.fn());

jest.mock('../../api/fetch', () => ({ put: jest.fn() }));

const { getAdminPromocodes, createAdminPromocode, updateAdminPromocode } = require('../../api/all/admin');
const openNotification = require('../../components/mini/openNotification');

const row = {
    code: 'SUMMER_50',
    bonus: 50,
    used: 2,
    limit: 10,
    active: true,
    expiresAt: '2030-06-01T12:00:00.000Z',
    description: 'Summer gift',
    created_at: '2026-11-01T12:00:00.000Z',
};

beforeEach(() => {
    jest.clearAllMocks();
    getAdminPromocodes.mockResolvedValue({ data: [row] });
    createAdminPromocode.mockResolvedValue({
        data: {
            ...row, code: 'NEW', used: 0, expiresAt: null,
        },
    });
    updateAdminPromocode.mockResolvedValue({
        data: {
            ...row, active: false, limit: 20, expiresAt: null, description: 'New description',
        },
    });
});

const openEditor = async (code = row.code) => {
    const tableRow = (await screen.findByText(code)).closest('tr');
    fireEvent.click(within(tableRow).getByRole('button', { name: 'admin.promocodes.edit' }));
    return screen.findByRole('dialog');
};

test('the table shows the code, bonus, uses, active state, dates and description', async () => {
    render(<PromocodesTab />);
    const tableRow = (await screen.findByText(row.code)).closest('tr');
    expect(within(tableRow).getByText('50.00')).toBeInTheDocument();
    expect(within(tableRow).getByText('2 / 10')).toBeInTheDocument();
    expect(within(tableRow).getByText('Summer gift')).toBeInTheDocument();
    expect(within(tableRow).getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(tableRow.querySelectorAll('time').length).toBe(2);
});

test('a legacy code with no creation date distinguishes that from an unlimited end date', async () => {
    getAdminPromocodes.mockResolvedValue({ data: [{ ...row, created_at: null, expiresAt: null }] });
    render(<PromocodesTab />);
    const tableRow = (await screen.findByText(row.code)).closest('tr');
    expect(within(tableRow).getByText('admin.promocodes.noExpiry')).toBeInTheDocument();
    expect(within(tableRow).getByText('admin.promocodes.unknownDate')).toBeInTheDocument();
});

test('a create form sends defaults and inserts the returned code at the start of the table', async () => {
    render(<PromocodesTab />);
    await screen.findByText(row.code);
    fireEvent.click(screen.getByRole('button', { name: 'admin.promocodes.create' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.code'), { target: { value: 'NEW' } });
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.bonus'), { target: { value: '50' } });
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.limit'), { target: { value: '10' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'admin.save' }));
    await waitFor(() => expect(createAdminPromocode).toHaveBeenCalledWith({
        code: 'NEW', bonus: '50', limit: 10, active: true, description: '',
    }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('NEW');
});

test('an edit keeps code and bonus fixed and clears the end date with null', async () => {
    render(<PromocodesTab />);
    const dialog = await openEditor();
    expect(within(dialog).queryByLabelText('admin.promocodes.code')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('admin.promocodes.bonus')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('switch', { name: 'admin.promocodes.active' }));
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.limit'), { target: { value: '20' } });
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.expiresAt'), { target: { value: '' } });
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.description'), { target: { value: 'New description' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'admin.save' }));
    await waitFor(() => expect(updateAdminPromocode).toHaveBeenCalledWith('SUMMER_50', {
        active: false, limit: 20, expiresAt: null, description: 'New description',
    }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('2 / 20')).toBeInTheDocument();
    expect(screen.getByText('New description')).toBeInTheDocument();
});

test.each([0, 3650 * 86400000])('a changed end date is sent as an ISO instant at clock offset %i while unchanged fields are omitted', async (offset) => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + offset);
    try {
        render(<PromocodesTab />);
        const dialog = await openEditor();
        const nextDay = new Date(Date.now() + 86400000);
        const localDate = new Date(nextDay.getTime() - nextDay.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        fireEvent.change(within(dialog).getByLabelText('admin.promocodes.expiresAt'), { target: { value: localDate } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'admin.save' }));
        await waitFor(() => expect(updateAdminPromocode).toHaveBeenCalledWith('SUMMER_50', {
            expiresAt: new Date(localDate).toISOString(),
        }));
    } finally { clock.mockRestore(); }
});

test.each(['cancel', 'save'])('opening another code after %s shows and sends its own values', async (action) => {
    const second = {
        ...row, code: 'SECOND', limit: 3, active: false, expiresAt: null, description: 'Second gift',
    };
    getAdminPromocodes.mockResolvedValue({ data: [row, second] });
    updateAdminPromocode.mockImplementation(async (code, fields) => ({
        data: { ...(code === row.code ? row : second), ...fields },
    }));
    render(<PromocodesTab />);
    const firstDialog = await openEditor();
    fireEvent.change(within(firstDialog).getByLabelText('admin.promocodes.limit'), { target: { value: '20' } });
    fireEvent.change(within(firstDialog).getByLabelText('admin.promocodes.expiresAt'), { target: { value: '' } });
    fireEvent.change(within(firstDialog).getByLabelText('admin.promocodes.description'), { target: { value: 'Edited first' } });
    fireEvent.click(within(firstDialog).getByRole('button', { name: `admin.${action}` }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    if (action === 'save') {
        expect(updateAdminPromocode).toHaveBeenCalledWith(row.code, { limit: 20, expiresAt: null, description: 'Edited first' });
    } else {
        expect(updateAdminPromocode).not.toHaveBeenCalled();
    }
    const secondDialog = await openEditor(second.code);
    expect(within(secondDialog).getByLabelText('admin.promocodes.limit')).toHaveValue('3');
    expect(within(secondDialog).getByLabelText('admin.promocodes.expiresAt')).toHaveValue('');
    expect(within(secondDialog).getByLabelText('admin.promocodes.description')).toHaveValue('Second gift');
    expect(within(secondDialog).getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(within(secondDialog).getByRole('switch'));
    fireEvent.click(within(secondDialog).getByRole('button', { name: 'admin.save' }));
    await waitFor(() => expect(updateAdminPromocode).toHaveBeenLastCalledWith(second.code, { active: true }));
    expect(updateAdminPromocode).toHaveBeenCalledTimes(action === 'save' ? 2 : 1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('creating after cancelling an edit starts with fresh defaults', async () => {
    render(<PromocodesTab />);
    const dialog = await openEditor();
    fireEvent.click(within(dialog).getByRole('button', { name: 'admin.cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'admin.promocodes.create' }));
    const createDialog = await screen.findByRole('dialog');
    expect(within(createDialog).getByLabelText('admin.promocodes.code')).toHaveValue('');
    expect(within(createDialog).getByLabelText('admin.promocodes.bonus')).toHaveValue('');
    expect(within(createDialog).getByLabelText('admin.promocodes.limit')).toHaveValue('1');
    expect(within(createDialog).getByLabelText('admin.promocodes.expiresAt')).toHaveValue('');
    expect(within(createDialog).getByLabelText('admin.promocodes.description')).toHaveValue('');
    expect(within(createDialog).getByRole('switch')).toHaveAttribute('aria-checked', 'true');
});

test.each([
    ['GO', 'GO'],
    ['BONUS.100', 'BONUS.100'],
    ['код', '%D0%BA%D0%BE%D0%B4'],
    ['BONUS/100 ?#%', 'BONUS%2F100%20%3F%23%25'],
])('the update API encodes legacy code %s as one URL segment', (code, encoded) => {
    const api = jest.requireActual('../../api/all/admin');
    const { put } = require('../../api/fetch');
    api.updateAdminPromocode(code, { active: false });
    expect(put).toHaveBeenCalledWith(`/admin/promocode/${encoded}`, { active: false });
});

test('the table active switch saves its state, and a refusal preserves the old state and shows its reason', async () => {
    const reason = 'Code could not be changed';
    updateAdminPromocode.mockRejectedValue({ error: 422, message: reason });
    render(<PromocodesTab />);
    const tableRow = (await screen.findByText(row.code)).closest('tr');
    fireEvent.click(within(tableRow).getByRole('switch'));
    await waitFor(() => expect(updateAdminPromocode).toHaveBeenCalledWith('SUMMER_50', { active: false }));
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'admin.promocodes.saveFailed', reason));
    expect(within(tableRow).getByRole('switch')).toHaveAttribute('aria-checked', 'true');
});

test('a refused create keeps its draft open and shows the server message', async () => {
    createAdminPromocode.mockRejectedValue({ error: 422, message: 'Code already exists' });
    render(<PromocodesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'admin.promocodes.create' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.code'), { target: { value: 'NEW' } });
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.bonus'), { target: { value: '50' } });
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.limit'), { target: { value: '10' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'admin.save' }));
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'admin.promocodes.saveFailed', 'Code already exists'));
    expect(within(screen.getByRole('dialog')).getByLabelText('admin.promocodes.code')).toHaveValue('NEW');
});

test('a network failure uses the translated fallback and leaves the editor open', async () => {
    updateAdminPromocode.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<PromocodesTab />);
    const dialog = await openEditor();
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.description'), { target: { value: 'Changed' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'admin.save' }));
    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'admin.promocodes.saveFailed', 'common.serverError'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('a failed load shows an error alert and a retry loads the list', async () => {
    getAdminPromocodes.mockRejectedValueOnce({ error: 500 });
    render(<PromocodesTab />);
    expect(await screen.findByRole('alert')).toHaveTextContent('admin.promocodes.loadFailed');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(await screen.findByText(row.code)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('invalid code, bonus, limit and past end date are refused before sending', async () => {
    render(<PromocodesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'admin.promocodes.create' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.code'), { target: { value: 'AB' } });
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.bonus'), { target: { value: '0.001' } });
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.limit'), { target: { value: '0' } });
    fireEvent.change(within(dialog).getByLabelText('admin.promocodes.expiresAt'), { target: { value: '2000-01-01T12:00' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'admin.save' }));
    expect(await within(dialog).findByText('admin.promocodes.codeInvalid')).toBeInTheDocument();
    expect(within(dialog).getByText('admin.promocodes.bonusInvalid')).toBeInTheDocument();
    expect(within(dialog).getByText('admin.promocodes.limitInvalid')).toBeInTheDocument();
    expect(within(dialog).getByText('admin.promocodes.expiresAtInvalid')).toBeInTheDocument();
    expect(createAdminPromocode).not.toHaveBeenCalled();
});
