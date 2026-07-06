import React from 'react';
import { useTranslation } from 'react-i18next';

const ErrorPage = () => {
    const { t } = useTranslation();
    return (
        <div className="errorpage">
            <span>
                <i>404</i>
                {t('error.notFound')}
            </span>
        </div>
    );
};

export default ErrorPage;
