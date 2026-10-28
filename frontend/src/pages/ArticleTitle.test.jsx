import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppSwitch from '../router/AppSwitch';
import Article from './Article';

let mockLanguage = 'uk';
const mockTranslators = {};

jest.mock('react-i18next', () => {
    const mockReact = require('react');
    const translatorFor = (language) => {
        if (!mockTranslators[language]) {
            mockTranslators[language] = (key) => `${language}:${key}`;
        }
        return mockTranslators[language];
    };
    return {
        useTranslation: () => ({ t: translatorFor(mockLanguage), i18n: { language: mockLanguage } }),
        withTranslation: () => (Component) => (props) => mockReact.createElement(Component, { ...props, t: translatorFor(mockLanguage) }),
    };
});

jest.mock('react-reveal/Fade', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('../api/all/article', () => ({ getArticleById: jest.fn() }));

const { getArticleById } = require('../api/all/article');

const routes = {
    public: [{ path: '/article/:id', component: Article, titleKey: 'article.loading' }],
    private: [],
    admin: [],
};

const site = () => (
    <MemoryRouter initialEntries={['/article/12']}>
        <AppSwitch routes={routes} user={{}} sessionChecked fallback={() => null} />
    </MemoryRouter>
);

test('an article without an English version keeps its own title in the tab when the site language changes', async () => {
    getArticleById.mockResolvedValue({ data: { article_id: 12, article_title: 'Стара стаття', article_text: '<p>Текст</p>' } });
    const { rerender } = render(site());
    await screen.findByText('Стара стаття');
    expect(document.title).toBe('Стара стаття — CASES.UA');

    mockLanguage = 'en';
    rerender(site());

    expect(document.title).toBe('Стара стаття — CASES.UA');
});
