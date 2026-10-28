import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ErrorPage = () => {
    const { t } = useTranslation();
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
