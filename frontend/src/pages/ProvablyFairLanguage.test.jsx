import React from 'react';
import {
    render, screen, fireEvent, act,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { MemoryRouter, Route } from 'react-router-dom';
import itemCacheReducer from '../store/reducers/itemCache';
import i18n from '../i18n';
import ProvablyFair from './ProvablyFair';

jest.mock('../api/all/provablyFair', () => ({
    getProvablyFairState: jest.fn(),
    setClientSeed: jest.fn(),
    rotateSeed: jest.fn(),
    getOpenHistory: jest.fn(),
    verifyOpen: jest.fn(),
}));

jest.mock('../components/mini/openNotification', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('../api/all/item', () => ({ getItemsInfo: jest.fn() }));

const api = require('../api/all/provablyFair');

const renderPage = () => {
    const store = createStore(
        combineReducers({ user: (state = {}) => state, itemCache: itemCacheReducer }),
        applyMiddleware(thunk),
    );
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={['/provably-fair']}>
                <Route path="/provably-fair"><ProvablyFair /></Route>
            </MemoryRouter>
        </Provider>,
    );
};

afterAll(() => i18n.changeLanguage('uk'));

test('a draw check stopped by the limiter keeps its reason in the language the site switches to', async () => {
    await i18n.changeLanguage('uk');
    api.verifyOpen.mockRejectedValue({
        error: 429, code: 'LIMIT.VERIFY', message: 'Забагато перевірок. Зачекайте трохи.',
    });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(i18n.t('provablyFair.serverSeedPlaceholder')), { target: { value: 'server' } });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('provablyFair.clientSeedPlaceholder')), { target: { value: 'client' } });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('provablyFair.noncePlaceholder')), { target: { value: '3' } });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('provablyFair.caseIdPlaceholder')), { target: { value: 'dust2' } });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('provablyFair.compute') }));

    expect(await screen.findByText('Забагато перевірок. Зачекайте трохи.')).toBeInTheDocument();

    await act(async () => { await i18n.changeLanguage('en'); });
    expect(await screen.findByText('Too many checks. Wait a little.')).toBeInTheDocument();
});
