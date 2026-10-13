import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
