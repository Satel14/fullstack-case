import React from 'react';
import { useTranslation } from 'react-i18next';

const LANGS = [
    { code: 'uk', label: 'UK' },
    { code: 'en', label: 'EN' },
];

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const current = (i18n.resolvedLanguage || i18n.language || 'uk').slice(0, 2);

    return (
        <div className="language-switcher">
            {LANGS.map((lang) => (
                <button
                    type="button"
                    key={lang.code}
                    className={`language-switcher__btn${current === lang.code ? ' is-active' : ''}`}
                    onClick={() => i18n.changeLanguage(lang.code)}
                >
                    {lang.label}
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
