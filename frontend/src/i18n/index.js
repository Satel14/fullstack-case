import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import uk from './locales/uk/translation.json';
import en from './locales/en/translation.json';
import { siteLanguage } from './language';

i18n.on('languageChanged', (language) => {
    document.documentElement.setAttribute('lang', siteLanguage(language));
});

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            uk: { translation: uk },
            en: { translation: en },
        },
        fallbackLng: 'uk',
        supportedLngs: ['uk', 'en'],
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
