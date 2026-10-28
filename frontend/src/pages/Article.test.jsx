import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Article from './Article';

let mockLanguage = 'uk';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: mockLanguage } }),
}));

jest.mock('react-reveal/Fade', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('../api/all/article', () => ({ getArticleById: jest.fn() }));

const { getArticleById } = require('../api/all/article');

const bilingual = {
    article_id: 6,
    article_title: 'Правила сервісу',
    article_text: '<p>Український текст</p>',
    article_titleEn: 'Service rules',
    article_textEn: '<p>English text</p>',
};

const renderArticle = () => render(
    <MemoryRouter>
        <Article match={{ params: { id: '6' } }} />
    </MemoryRouter>,
);

test.each([
    ['uk', 'Правила сервісу', 'Український текст'],
    ['en', 'Service rules', 'English text'],
    ['en-GB', 'Service rules', 'English text'],
])('an article is shown in the site language (%s)', async (language, title, text) => {
    mockLanguage = language;
    getArticleById.mockResolvedValue({ data: bilingual });

    renderArticle();

    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
});

test('an article that has no English version is shown in Ukrainian on the English site', async () => {
    mockLanguage = 'en';
    getArticleById.mockResolvedValue({ data: { ...bilingual, article_titleEn: null, article_textEn: null } });

    renderArticle();

    expect(await screen.findByText('Правила сервісу')).toBeInTheDocument();
    expect(screen.getByText('Український текст')).toBeInTheDocument();
});

test('the browser tab carries the article title in the site language', async () => {
    mockLanguage = 'en';
    getArticleById.mockResolvedValue({ data: bilingual });

    renderArticle();

    await screen.findByText('Service rules');
    expect(document.title).toBe('Service rules — CASES.UA');
});
