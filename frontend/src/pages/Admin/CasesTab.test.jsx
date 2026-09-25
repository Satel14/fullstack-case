import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import CasesTab from './CasesTab';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../api/all/admin', () => ({
    getAdminCases: jest.fn(),
    updateAdminCase: jest.fn(),
}));

jest.mock('../../components/mini/openNotification', () => jest.fn());

const { getAdminCases, updateAdminCase } = require('../../api/all/admin');
const openNotification = require('../../components/mini/openNotification');

const row = {
    case_id: 'havoc',
    case_title: 'Havoc',
    case_price: 1453,
    case_discount: 50,
    case_openLimit: -1,
    case_openedCount: 0,
    case_published: 1,
};

const salePriceInput = async () => {
    const [, salePrice] = await screen.findAllByRole('spinbutton');
    return salePrice;
};

beforeEach(() => {
    getAdminCases.mockReset();
    updateAdminCase.mockReset();
    openNotification.mockReset();
    getAdminCases.mockResolvedValue({ data: [row] });
});

test('an emptied sale price is saved as no discount', async () => {
    updateAdminCase.mockResolvedValue({ data: { ...row, case_discount: 0 } });
    render(<CasesTab />);

    fireEvent.change(await salePriceInput(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.save' }));

    await waitFor(() => expect(updateAdminCase).toHaveBeenCalledWith('havoc', { case_discount: 0 }));
});

test('a refused save shows the reason the server gave', async () => {
    const reason = 'Ціна зі знижкою має бути меншою за ціну кейсу, а 0 знімає знижку';
    updateAdminCase.mockRejectedValue({ error: 422, message: reason });
    render(<CasesTab />);

    fireEvent.change(await salePriceInput(), { target: { value: '2000' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.save' }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'admin.cases.saveFailed', reason));
});
