import React from 'react';
import { useTranslation } from 'react-i18next';

const LocalTime = ({ value }) => {
    const { i18n } = useTranslation();
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) {
        return value || null;
    }
    return <time dateTime={value}>{date.toLocaleString(i18n && (i18n.resolvedLanguage || i18n.language))}</time>;
};

export default LocalTime;
