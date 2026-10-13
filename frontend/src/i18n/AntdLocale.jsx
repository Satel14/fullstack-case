import React from 'react';
import { ConfigProvider } from 'antd';
import ukUA from 'antd/lib/locale/uk_UA';
import enUS from 'antd/lib/locale/en_US';
import { useTranslation } from 'react-i18next';
import { siteLanguage } from './language';

const ANTD_LOCALES = { uk: ukUA, en: enUS };

const AntdLocale = ({ children }) => {
    const { i18n } = useTranslation();
    const language = siteLanguage(i18n.resolvedLanguage || i18n.language);

    return <ConfigProvider locale={ANTD_LOCALES[language]}>{children}</ConfigProvider>;
};

export default AntdLocale;
