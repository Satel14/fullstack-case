import React from 'react';
import {
    render, screen, fireEvent, waitFor, act,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import Promocode from './Promocode';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../store/actions/user', () => ({
    redeemPromocodeFetch: jest.fn(),
}));

afterEach(() => {
    window.history.replaceState(null, '', '/');
});

const pendingNavigation = () => new Promise((resolve) => { setTimeout(resolve, 20); });

const { redeemPromocodeFetch } = require('../store/actions/user');

test('a promocode cannot be sent again while the first request is in flight', async () => {
    let settle;
    redeemPromocodeFetch.mockImplementationOnce(() => () => new Promise((resolve) => { settle = resolve; }));
    const store = createStore(() => ({}), applyMiddleware(thunk));
    render(
        <Provider store={store}>
            <Promocode />
        </Provider>,
    );
    const input = screen.getByPlaceholderText('promocode.placeholder');
    fireEvent.change(input, { target: { value: 'BONUS' } });
    fireEvent.click(screen.getByRole('button', { name: /promocode\.submit/ }));
    await waitFor(() => expect(redeemPromocodeFetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /promocode\.submit/ }));
    fireEvent.submit(input.closest('form'));
    await act(() => new Promise((resolve) => { setTimeout(resolve, 50); }));

    expect(redeemPromocodeFetch).toHaveBeenCalledTimes(1);

    await act(async () => { settle({ status: 200, balance: 150, message: 'Промокод активовано' }); });
    redeemPromocodeFetch.mockImplementationOnce(() => () => Promise.resolve({ status: 200, message: 'Ви вже використали цей промокод' }));
    fireEvent.click(screen.getByRole('button', { name: /promocode\.submit/ }));
    await waitFor(() => expect(redeemPromocodeFetch).toHaveBeenCalledTimes(2));
});

test('the "where to get" hint does not navigate or jump to the top when clicked', async () => {
    window.history.replaceState(null, '', '/promocode#form');
    const store = createStore(() => ({}), applyMiddleware(thunk));
    render(
        <Provider store={store}>
            <Promocode />
        </Provider>,
    );
    const hint = screen.getByText('promocode.whereToGet');

    expect(hint.tagName).toBe('A');
    expect(hint).toHaveAttribute('href', '#');
    expect(fireEvent.click(hint)).toBe(false);
    await pendingNavigation();
    expect(window.location.hash).toBe('#form');
    expect(window.location.pathname).toBe('/promocode');
});
