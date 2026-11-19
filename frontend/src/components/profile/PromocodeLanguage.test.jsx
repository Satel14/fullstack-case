import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { notification } from 'antd';
import i18n from '../../i18n';
import Promocode from './Promocode';

jest.mock('../../api/all/other', () => ({ redeemPromocode: jest.fn() }));

const { redeemPromocode } = require('../../api/all/other');

afterEach(() => notification.destroy());
afterAll(() => i18n.changeLanguage('uk'));

const submit = (code) => {
    fireEvent.change(screen.getByPlaceholderText(i18n.t('promocode.placeholder')), { target: { value: code } });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('promocode.submit') }));
};

test('the answers to a promocode read in English on the English site', async () => {
    await i18n.changeLanguage('en');
    render(
        <Provider store={createStore(() => ({}), applyMiddleware(thunk))}>
            <Promocode />
        </Provider>,
    );

    redeemPromocode.mockResolvedValueOnce({
        status: 200,
        balance: 150,
        code: 'PROMOCODE.ADDED',
        params: { bonus: '50.00', description: 'Spring gift' },
        message: 'Промокод активовано, нараховано 50.00 ₴. Опис бонусу: Spring gift',
    });
    submit('SPRING');
    expect(await screen.findByText('Promocode activated: 50.00 ₴ credited. Bonus description: Spring gift')).toBeInTheDocument();

    redeemPromocode.mockResolvedValueOnce({ status: 200, code: 'PROMOCODE.EXPIRED', message: 'Термін дії цього промокоду минув' });
    submit('OLD');
    expect(await screen.findByText('This promocode has expired')).toBeInTheDocument();
});
