import React from 'react';
import {
    render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import ItemOptions from './ItemOptions';
import openNotification from '../mini/openNotification';
import { receiveItemByStorageId } from '../../api/all/storage';

jest.mock('react-i18next', () => ({
    withTranslation: () => (Component) => (props) => <Component {...props} t={(key) => key} />,
}));

jest.mock('../mini/openNotification', () => jest.fn());

jest.mock('../../api/all/storage', () => ({
    receiveItemByStorageId: jest.fn(),
    sellItemByStorageId: jest.fn(),
}));

jest.mock('../../api/all/item', () => ({
    getItemPriceById: jest.fn(() => Promise.resolve({ prices: { default: 10 } })),
}));

const item = {
    storage_id: 42, storage_itemId: 707, storage_color: 'default', item_name: 'AK-47 | Redline',
};

const renderWithUser = (receiveInfo, props = {}) => {
    const store = createStore(() => ({ user: { receiveInfo }, modules: {} }));
    return render(
        <Provider store={store}>
            <ItemOptions item={item} {...props} />
        </Provider>,
    );
};

afterEach(() => {
    jest.clearAllMocks();
});

test.each([[null], [''], ['   ']])('a withdrawal without receive info (%p) asks for it and sends nothing', async (receiveInfo) => {
    renderWithUser(receiveInfo);

    fireEvent.click(screen.getByRole('button', { name: /itemOptions.withdraw/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'common.error', 'itemOptions.needTradeInfo',
    ));
    expect(receiveItemByStorageId).not.toHaveBeenCalled();
});

test('a withdrawal the server refuses shows the reason it gave', async () => {
    receiveItemByStorageId.mockRejectedValueOnce({ error: 422, message: 'Вкажіть у налаштуваннях профілю дані вашого Steam або Epic' });
    const onItemRemoved = jest.fn();
    renderWithUser('steam:abc', { onItemRemoved });

    fireEvent.click(screen.getByRole('button', { name: /itemOptions.withdraw/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'common.error', 'Вкажіть у налаштуваннях профілю дані вашого Steam або Epic',
    ));
    expect(receiveItemByStorageId).toHaveBeenCalledWith(42);
    expect(onItemRemoved).not.toHaveBeenCalled();
});

test('a withdrawal the server refuses without a reason falls back to the server-error text', async () => {
    receiveItemByStorageId.mockRejectedValueOnce({ error: 500 });
    renderWithUser('steam:abc');

    fireEvent.click(screen.getByRole('button', { name: /itemOptions.withdraw/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'error', 'common.error', 'common.serverError',
    ));
});

test('an accepted withdrawal removes the item and says a trader will follow up', async () => {
    receiveItemByStorageId.mockResolvedValueOnce({ status: 200 });
    const onItemRemoved = jest.fn();
    renderWithUser('steam:abc', { onItemRemoved });

    fireEvent.click(screen.getByRole('button', { name: /itemOptions.withdraw/ }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(
        'success', 'itemOptions.withdrawRequested', 'itemOptions.withdrawText',
    ));
    expect(onItemRemoved).toHaveBeenCalledWith(42);
});
