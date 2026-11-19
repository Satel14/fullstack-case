import React from 'react';
import {
    act, render, screen, fireEvent,
} from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import i18n from '../../i18n';
import ConfirmEmail from './ConfirmEmail';

jest.mock('../../store/actions/user', () => ({ confirmEmailFetch: jest.fn() }));
jest.mock('../../components/mini/openNotification', () => ({ __esModule: true, default: jest.fn() }));

const { confirmEmailFetch } = require('../../store/actions/user');

afterAll(() => i18n.changeLanguage('uk'));

test('a refused link keeps its reason in the language the site switches to', async () => {
    await i18n.changeLanguage('uk');
    confirmEmailFetch.mockImplementation(() => () => Promise.reject({
        error: 422, code: 'AUTH.CONFIRM_LINK_INVALID', message: 'Посилання недійсне або застаріло. Зареєструйтеся ще раз',
    }));
    render(
        <Provider store={createStore(() => ({}), applyMiddleware(thunk))}>
            <MemoryRouter initialEntries={[`/confirm-email?token=${'a'.repeat(64)}`]}>
                <Route path="/confirm-email" component={ConfirmEmail} />
            </MemoryRouter>
        </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: i18n.t('auth.confirm.submit') }));
    expect(await screen.findByText('Посилання недійсне або застаріло. Зареєструйтеся ще раз')).toBeInTheDocument();

    await act(async () => { await i18n.changeLanguage('en'); });
    expect(await screen.findByText('The link is invalid or has expired. Register again')).toBeInTheDocument();
});
