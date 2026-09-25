import React from 'react';
import {
    render, screen, fireEvent, waitFor,
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
    usePromocode: jest.fn(),
}));

const { usePromocode } = require('../../api/all/other');

afterEach(() => {
    notification.destroy();
    usePromocode.mockReset();
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
    usePromocode.mockRejectedValue({ error: 429, message: 'too many' });

    submit('BONUS');

    await waitFor(() => expect(usePromocode).toHaveBeenCalledWith({ promocode: 'BONUS' }));
    expect(await screen.findByText('promocode.failed')).toBeInTheDocument();
    expect(screen.getByText('promocode.errorTitle')).toBeInTheDocument();
});

test('an answer without a balance shows the server message as an error', async () => {
    usePromocode.mockResolvedValue({ status: 200, message: 'Такого промокоду не існує' });

    submit('NOPE');

    expect(await screen.findByText('Такого промокоду не існує')).toBeInTheDocument();
    expect(screen.getByText('promocode.errorTitle')).toBeInTheDocument();
});
