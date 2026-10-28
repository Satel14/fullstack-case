import routes from './routes';
import uk from '../i18n/locales/uk/translation.json';
import en from '../i18n/locales/en/translation.json';

const translated = (dictionary, key) => key.split('.').reduce((node, part) => (node ? node[part] : undefined), dictionary);

const pages = [...routes.public, ...routes.private, ...routes.admin]
    .filter((route) => !['/', '/article', '/case', '/profile'].includes(route.path));

test('every page names itself in the browser tab, in both languages', () => {
    const missing = pages
        .filter((route) => !route.titleKey
            || typeof translated(uk, route.titleKey) !== 'string'
            || typeof translated(en, route.titleKey) !== 'string')
        .map((route) => `${route.path} (${route.titleKey || 'no titleKey'})`);

    expect(pages.length).toBeGreaterThan(15);
    expect(missing).toEqual([]);
});
