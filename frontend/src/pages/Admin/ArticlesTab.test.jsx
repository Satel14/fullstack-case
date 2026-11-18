import React from 'react';
import {
    render, screen, fireEvent, waitFor, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ArticlesTab from './ArticlesTab';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key, options) => (options && options.id ? `${key}:${options.id}` : key) }),
}));

jest.mock('../../api/all/admin', () => ({
    getAdminArticles: jest.fn(),
    updateAdminArticle: jest.fn(),
}));

jest.mock('../../components/mini/openNotification', () => jest.fn());

const { getAdminArticles, updateAdminArticle } = require('../../api/all/admin');
const openNotification = require('../../components/mini/openNotification');

const rules = {
    article_id: 6,
    article_title: 'Правила сервісу',
    article_text: '<p>Старі правила</p>',
    article_titleEn: 'Service Rules',
    article_textEn: '<p>Old rules</p>',
    updated_at: '2026-10-28T10:00:00.000Z',
};

const contacts = {
    article_id: 9,
    article_title: 'Контакти',
    article_text: '<p>Пишіть у чат</p>',
    article_titleEn: null,
    article_textEn: null,
    updated_at: '2026-10-28T10:00:00.000Z',
};

const renderTab = () => render(
    <MemoryRouter>
        <ArticlesTab />
    </MemoryRouter>,
);

const openEditor = async (title) => {
    const row = (await screen.findByText(title)).closest('tr');
    fireEvent.click(within(row).getByRole('button', { name: 'admin.articles.edit' }));
    return screen.findByRole('dialog');
};

const preview = () => document.querySelector('.article-editor__preview');

beforeEach(() => {
    getAdminArticles.mockReset();
    updateAdminArticle.mockReset();
    openNotification.mockReset();
    getAdminArticles.mockResolvedValue({ data: [rules, contacts] });
});

test('every article is listed with a link to its page', async () => {
    renderTab();

    expect(await screen.findByText('Правила сервісу')).toBeInTheDocument();
    expect(screen.getByText('Service Rules')).toBeInTheDocument();
    expect(screen.getByText('Контакти')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'admin.articles.open' }).map((link) => link.getAttribute('href')))
        .toEqual(['/article/6', '/article/9']);
});

test('an edited article is saved with all four fields and the editor then shows what the server stored', async () => {
    updateAdminArticle.mockResolvedValue({
        data: { ...rules, article_title: 'Правила', article_text: '<p>Нові правила</p>' },
    });
    renderTab();
    await openEditor('Правила сервісу');

    fireEvent.change(screen.getByLabelText('admin.articles.title'), { target: { value: 'Правила' } });
    fireEvent.change(screen.getByLabelText('admin.articles.text'), { target: { value: '<p>Нові правила</p><script>x()</script>' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.save' }));

    await waitFor(() => expect(updateAdminArticle).toHaveBeenCalledWith(6, {
        article_title: 'Правила',
        article_text: '<p>Нові правила</p><script>x()</script>',
        article_titleEn: 'Service Rules',
        article_textEn: '<p>Old rules</p>',
    }));
    await waitFor(() => expect(screen.getByLabelText('admin.articles.text').value).toBe('<p>Нові правила</p>'));
    expect(openNotification).toHaveBeenCalledWith('success', 'admin.articles.saved', 'Правила');
    expect(within(document.querySelector('[data-row-key="6"]')).getByText('Правила')).toBeInTheDocument();
});

test('the editor cannot be closed while a save is on its way, so the answer never lands in another article', async () => {
    let answer;
    updateAdminArticle.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
    renderTab();
    await openEditor('Правила сервісу');

    fireEvent.click(screen.getByRole('button', { name: 'admin.save' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'admin.cancel' })).toBeDisabled());
    expect(document.querySelector('.ant-modal-close')).toBeNull();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', keyCode: 27 });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    answer({ data: { ...rules, article_text: '<p>Збережено</p>' } });
    await waitFor(() => expect(screen.getByLabelText('admin.articles.text').value).toBe('<p>Збережено</p>'));
    expect(screen.getByRole('button', { name: 'admin.cancel' })).not.toBeDisabled();
});

test('the preview shows the text as the article page will, without markup an article may not use', async () => {
    renderTab();
    await openEditor('Правила сервісу');

    fireEvent.change(screen.getByLabelText('admin.articles.text'), {
        target: { value: '<p onclick="steal()">Привіт<img src="x" onerror="steal()"><script>steal()</script></p>' },
    });

    expect(within(preview()).getByText('Привіт')).toBeInTheDocument();
    expect(preview().querySelector('img, script, [onclick]')).toBeNull();
});

const englishPreview = async () => {
    fireEvent.click(screen.getByRole('tab', { name: 'admin.articles.previewEn' }));
    await waitFor(() => expect(document.querySelectorAll('.article-editor__preview')).toHaveLength(2));
    return document.querySelectorAll('.article-editor__preview')[1];
};

test('an article with an English version previews it in English', async () => {
    renderTab();
    await openEditor('Правила сервісу');

    const english = await englishPreview();

    expect(within(english).getByText('Service Rules')).toBeInTheDocument();
    expect(within(english).getByText('Old rules')).toBeInTheDocument();
    expect(screen.queryByText('admin.articles.enFallback')).toBeNull();
});

test('an article without an English version warns that English readers see the Ukrainian one', async () => {
    renderTab();
    await openEditor('Контакти');

    const english = await englishPreview();

    expect(screen.getByText('admin.articles.enFallback')).toBeInTheDocument();
    expect(within(english).getByText('Контакти')).toBeInTheDocument();
    expect(within(english).getByText('Пишіть у чат')).toBeInTheDocument();
    expect(screen.getByLabelText('admin.articles.titleEn').value).toBe('');
});

test('an English title of spaces or an English text with nothing to show counts as no English version', async () => {
    renderTab();
    await openEditor('Правила сервісу');

    fireEvent.change(screen.getByLabelText('admin.articles.titleEn'), { target: { value: '   ' } });
    const english = await englishPreview();
    expect(screen.getByText('admin.articles.enFallback')).toBeInTheDocument();
    expect(within(english).getByText('Правила сервісу')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('admin.articles.titleEn'), { target: { value: 'Service Rules' } });
    fireEvent.change(screen.getByLabelText('admin.articles.textEn'), { target: { value: '<p> </p><textarea>English text</textarea>' } });
    expect(screen.getByText('admin.articles.enFallback')).toBeInTheDocument();
    expect(within(english).getByText('Старі правила')).toBeInTheDocument();
});

test('a refused save shows the reason the server gave and keeps the editor open', async () => {
    const reason = 'Після очищення HTML текст статті українською порожній';
    updateAdminArticle.mockRejectedValue({ error: 422, message: reason });
    renderTab();
    await openEditor('Правила сервісу');

    fireEvent.click(screen.getByRole('button', { name: 'admin.save' }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'admin.articles.saveFailed', reason));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('a save that fails without an answer says the server failed', async () => {
    updateAdminArticle.mockRejectedValue(new TypeError('Failed to fetch'));
    renderTab();
    await openEditor('Правила сервісу');

    fireEvent.click(screen.getByRole('button', { name: 'admin.save' }));

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith('error', 'admin.articles.saveFailed', 'common.serverError'));
});

test('a list that cannot be loaded says so instead of looking empty', async () => {
    getAdminArticles.mockRejectedValue({ error: 500 });
    renderTab();

    expect(await screen.findByText('admin.articles.loadFailed', { selector: '.ant-alert-message' })).toBeInTheDocument();
});
