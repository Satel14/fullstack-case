import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DocumentTitle from './DocumentTitle';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

const routes = [
    { path: '/', exact: true },
    { path: '/top', exact: true, titleKey: 'menu.topPlayers' },
    { path: '/case/:id', titleKey: 'common.case' },
];

test.each([
    ['/', 'CASES.UA — site.tagline'],
    ['/top', 'menu.topPlayers — CASES.UA'],
    ['/case/dust2', 'common.case — CASES.UA'],
    ['/nope', 'error.notFound — CASES.UA'],
])('the browser tab of %s is titled "%s"', (path, expected) => {
    render(
        <MemoryRouter initialEntries={[path]}>
            <DocumentTitle routes={routes} />
        </MemoryRouter>,
    );

    expect(document.title).toBe(expected);
});
