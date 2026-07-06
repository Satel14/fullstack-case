import React from 'react';
import { Layout } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const { Footer } = Layout;
const currentYear = new Date().getFullYear();

const FooterLayout = () => {
    const { t } = useTranslation();
    return (
        <Footer>
            <div className="leftblock">
                <div>{`${currentYear} Case`}</div>
            </div>
            <div>
                {t('footer.about')}
                {' '}
                {t('footer.recaptcha')}
            </div>
            <div className="rightblock">
                <Link to="/article/3">{t('footer.agreement')}</Link>
                <Link to="/article/6">{t('footer.rules')}</Link>
                <Link to="/faq">FAQ</Link>
                <Link to="/article/9">{t('footer.reviews')}</Link>
            </div>
        </Footer>
    );
};

export default FooterLayout;
