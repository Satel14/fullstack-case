import React from 'react';
import {
    render, screen, fireEvent, waitFor, act,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { notification } from 'antd';
import Promocode from './Promocode';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../../api/all/other', () => ({
    redeemPromocode: jest.fn(),
}));

const { redeemPromocode } = require('../../api/all/other');

afterEach(() => {
    notification.destroy();
    redeemPromocode.mockReset();
});

const submit = (code) => {
    const store = createStore(() => ({}), applyMiddleware(thunk));
    render(
        <Provider store={store}>
            <Promocode />
        </Provider>,
    );
    fireEvent.change(screen.getByPlaceholderText('promocode.placeholder'), { target: { value: code } });
    fireEvent.click(screen.getByRole('button', { name: 'promocode.submit' }));
};

test('a rejected request tells the player the promocode was not activated', async () => {
    redeemPromocode.mockRejectedValue({ error: 429, message: 'too many' });

    submit('BONUS');

    await waitFor(() => expect(redeemPromocode).toHaveBeenCalledWith({ promocode: 'BONUS' }));
    expect(await screen.findByText('promocode.failed')).toBeInTheDocument();
    expect(screen.getByText('promocode.errorTitle')).toBeInTheDocument();
});

test('a promocode cannot be sent again while the first request is in flight', async () => {
    let settle;
    redeemPromocode.mockReturnValueOnce(new Promise((resolve) => { settle = resolve; }));

    submit('BONUS');
    await waitFor(() => expect(redeemPromocode).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /promocode\.submit/ }));
    fireEvent.submit(screen.getByPlaceholderText('promocode.placeholder').closest('form'));
    await act(() => new Promise((resolve) => { setTimeout(resolve, 50); }));

    expect(redeemPromocode).toHaveBeenCalledTimes(1);

    await act(async () => { settle({ status: 200, balance: 150, message: 'Промокод активовано' }); });

    expect(await screen.findByText('Промокод активовано')).toBeInTheDocument();
    redeemPromocode.mockResolvedValueOnce({ status: 200, message: 'Ви вже використали цей промокод' });
    fireEvent.click(screen.getByRole('button', { name: /promocode\.submit/ }));
    await waitFor(() => expect(redeemPromocode).toHaveBeenCalledTimes(2));
});

test('an answer without a balance shows the server message as an error', async () => {
    redeemPromocode.mockResolvedValue({ status: 200, message: 'Такого промокоду не існує' });

    submit('NOPE');

    expect(await screen.findByText('Такого промокоду не існує')).toBeInTheDocument();
    expect(screen.getByText('promocode.errorTitle')).toBeInTheDocument();
});
