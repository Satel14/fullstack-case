import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SITE_NAME } from '../config/publicInfo';

const DocumentTitle = ({ routes }) => {
    const { pathname } = useLocation();
    const { t } = useTranslation();

    useEffect(() => {
        const route = routes.find(({ path, exact }) => matchPath(pathname, { path, exact }));
        const titleKey = route ? route.titleKey : 'error.notFound';
        document.title = titleKey ? `${t(titleKey)} — ${SITE_NAME}` : `${SITE_NAME} — ${t('site.tagline')}`;
    }, [pathname, routes, t]);

    return null;
};

export default DocumentTitle;
