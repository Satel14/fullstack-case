import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, act } from '@testing-library/react';
import { Modal, Table } from 'antd';
import i18n from './index';
import AntdLocale from './AntdLocale';

const switchTo = (language) => act(async () => {
    await i18n.changeLanguage(language);
});

const emptyTable = () => (
    <AntdLocale>
        <Table dataSource={[]} columns={[{ title: 'Case', dataIndex: 'case' }]} />
    </AntdLocale>
);

afterEach(() => switchTo('uk'));

test('antd texts follow the site language and switch live with it', async () => {
    await switchTo('uk');
    render(emptyTable());

    expect(screen.getAllByText('Даних немає').length).toBeGreaterThan(0);
    expect(screen.queryByText('No data')).toBeNull();

    await switchTo('en');

    expect(screen.getAllByText('No data').length).toBeGreaterThan(0);
    expect(screen.queryByText('Даних немає')).toBeNull();
});

test('confirmation dialogs answer in the site language', async () => {
    await switchTo('uk');
    render(emptyTable());

    act(() => { Modal.confirm({ content: 'rotate?' }); });
    expect(await screen.findByRole('button', { name: 'Гаразд' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Скасувати' })).toBeInTheDocument();
    act(() => { Modal.destroyAll(); });

    await switchTo('en');
    act(() => { Modal.confirm({ content: 'rotate?' }); });
    expect(await screen.findByRole('button', { name: 'OK' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    act(() => { Modal.destroyAll(); });
});

test('the page language follows the site language', async () => {
    await switchTo('en');
    expect(document.documentElement.lang).toBe('en');

    await switchTo('uk');
    expect(document.documentElement.lang).toBe('uk');
});

test('a language the site does not have falls back to Ukrainian everywhere', async () => {
    await switchTo('en');
    render(emptyTable());

    await switchTo('de');

    expect(document.documentElement.lang).toBe('uk');
    expect(screen.getAllByText('Даних немає').length).toBeGreaterThan(0);
});

test('the page is Ukrainian before any script runs', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'index.html'), 'utf8');

    expect(html).toMatch(/<html lang="uk">/);
});
