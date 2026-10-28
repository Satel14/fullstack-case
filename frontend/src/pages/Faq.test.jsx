import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Faq from './Faq';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key, options) => (options ? `${key} ${JSON.stringify(options)}` : key) }),
}));

jest.mock('react-reveal/Fade', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('../config/publicInfo', () => ({ SITE_NAME: 'CASES.UA', SUPPORT_EMAIL: '' }));

const publicInfo = require('../config/publicInfo');

afterEach(() => {
    publicInfo.SUPPORT_EMAIL = '';
});

test('the FAQ also answers whether openings are fair, how withdrawals and money work, and which bonuses exist', () => {
    render(<Faq />);

    const questions = Array.from(document.querySelectorAll('.ant-collapse-header')).map((header) => header.textContent);
    expect(questions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `faq.q${n}.question`));
});

test('with no support address set, the contact answer points to the chat and shows no address', () => {
    render(<Faq />);

    fireEvent.click(screen.getByText('faq.q4.question'));

    expect(screen.getByText('faq.q4.answer')).toBeInTheDocument();
    expect(screen.queryByText(/faq\.q4\.email/)).toBeNull();
});

test('with a support address set, the contact answer adds it', () => {
    publicInfo.SUPPORT_EMAIL = 'help@cases.example';
    render(<Faq />);

    fireEvent.click(screen.getByText('faq.q4.question'));

    expect(screen.getByText('faq.q4.answer faq.q4.email {"email":"help@cases.example"}')).toBeInTheDocument();
});
