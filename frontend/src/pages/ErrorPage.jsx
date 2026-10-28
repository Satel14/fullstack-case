import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SITE_NAME } from '../config/publicInfo';

const ErrorPage = () => {
    const { t } = useTranslation();

    useEffect(() => {
        document.title = `${t('error.notFound')} — ${SITE_NAME}`;
    }, [t]);

    return (
        <div className="errorpage">
            <div className="errorpage-message">
                <i>404</i>
                {t('error.notFound')}
                <Link to="/">{t('error.goHome')}</Link>
            </div>
        </div>
    );
};

export default ErrorPage;
