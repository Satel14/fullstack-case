import React from 'react';
import {
    render, screen, fireEvent, waitFor, act,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { MemoryRouter, Route } from 'react-router-dom';
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

const { redeemPromocodeFetch } = require('../store/actions/user');

test('a promocode cannot be sent again while the first request is in flight', async () => {
    let settle;
    redeemPromocodeFetch.mockImplementationOnce(() => () => new Promise((resolve) => { settle = resolve; }));
    const store = createStore(() => ({}), applyMiddleware(thunk));
    render(
        <Provider store={store}>
            <MemoryRouter><Promocode /></MemoryRouter>
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

test('the "where to get" hint opens the credits article through the router', () => {
    const store = createStore(() => ({}), applyMiddleware(thunk));
    render(
        <Provider store={store}>
            <MemoryRouter initialEntries={['/promocode#form']}>
                <Promocode />
                <Route render={({ location }) => <output data-testid="destination">{location.pathname}{location.hash}</output>} />
            </MemoryRouter>
        </Provider>,
    );
    const hint = screen.getByText('promocode.whereToGet');

    expect(hint.tagName).toBe('A');
    expect(hint).toHaveAttribute('href', '/article/8');
    fireEvent.click(hint);
    expect(screen.getByTestId('destination')).toHaveTextContent(/^\/article\/8$/);
});
