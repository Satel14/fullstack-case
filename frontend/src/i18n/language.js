export const siteLanguage = (language) => (String(language || '').toLowerCase().startsWith('en') ? 'en' : 'uk');
