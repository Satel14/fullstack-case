import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import Banned from './Banned';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key, options) => (options ? `${key} ${JSON.stringify(options)}` : key) }),
}));

jest.mock('../config/publicInfo', () => ({ SITE_NAME: 'CASES.UA', SUPPORT_EMAIL: '' }));

const publicInfo = require('../config/publicInfo');

const renderBanned = () => render(
    <Provider store={createStore(() => ({}))}>
        <Banned />
    </Provider>,
);

afterEach(() => {
    publicInfo.SUPPORT_EMAIL = '';
});

test('a banned player is told where to appeal when a support address is set', () => {
    publicInfo.SUPPORT_EMAIL = 'help@cases.example';

    renderBanned();

    expect(screen.getByText('banned.appeal {"email":"help@cases.example"}')).toBeInTheDocument();
});

test('without a support address the banned page offers no appeal line', () => {
    renderBanned();

    expect(screen.getByText('banned.message')).toBeInTheDocument();
    expect(screen.queryByText(/banned\.appeal/)).toBeNull();
});
