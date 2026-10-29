import React from 'react';
import { Menu } from 'antd';
import { Link, withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import {
    QuestionCircleOutlined,
    BarChartOutlined,
    CodeSandboxOutlined,
    GiftOutlined,
    TagsOutlined,
    UserOutlined,
    SafetyCertificateOutlined,
    AppstoreOutlined,
    SettingOutlined,
} from '@ant-design/icons';

import LanguageSwitcher from './LanguageSwitcher';
import { isAuthorized } from '../helpers/Player';
import { isAdmin } from '../helpers/permissions';

const mapStateToProps = (state) => ({
    user: state.user,
});

const KEY_OF_PAGE = {
    '/': 'cases',
    '/top': 'topplayers',
    '/bonus': 'bonus',
    '/faq': 'faq',
    '/article/8': 'moneynotenough',
    '/provably-fair': 'provablyfair',
    '/inventory': 'inventory',
    '/login': 'login',
    '/admin': 'admin',
};

const selectedKeys = (pathname) => {
    const page = pathname.toLowerCase().replace(/\/+$/, '') || '/';
    if (page.startsWith('/case/')) {
        return ['cases'];
    }
    return KEY_OF_PAGE[page] ? [KEY_OF_PAGE[page]] : [];
};

class MenuLayoutSlider extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    getMenuItems = () => {
        const { user, t } = this.props;
        const defaultMenu = [
            {
                key: 'cases',
                label: <Link to="/">{t('menu.cases')}</Link>,
                icon: <CodeSandboxOutlined />,
            },
            {
                key: 'topplayers',
                label: <Link to="/top">{t('menu.topPlayers')}</Link>,
                icon: <BarChartOutlined />,
            },
            {
                key: 'bonus',
                label: <Link to="/bonus">{t('menu.bonus')}</Link>,
                icon: <GiftOutlined />,
            },
            {
                key: 'faq',
                label: <Link to="/faq">{t('menu.faq')}</Link>,
                icon: <QuestionCircleOutlined />,
            },
            {
                key: 'moneynotenough',
                label: <Link to="/article/8">{t('menu.moreMoney')}</Link>,
                icon: <TagsOutlined />,
            },
        ];

        defaultMenu.splice(2, 0, {
            key: 'provablyfair',
            label: <Link to="/provably-fair">{t('provablyFair.title')}</Link>,
            icon: <SafetyCertificateOutlined />,
        });

        if (isAuthorized(user)) {
            defaultMenu.splice(3, 0, {
                key: 'inventory',
                label: <Link to="/inventory">{t('inventory.title')}</Link>,
                icon: <AppstoreOutlined />,
            });
        }

        if (!isAuthorized(user)) {
            defaultMenu.push({
                key: 'login',
                label: <Link to="/login">{t('menu.login')}</Link>,
                icon: <UserOutlined />,
            });
        }

        if (isAdmin(user)) {
            defaultMenu.push({
                key: 'admin',
                label: <Link to="/admin">{t('admin.title')}</Link>,
                icon: <SettingOutlined />,
            });
        }

        return defaultMenu;
    }

    render() {
        return (
            <>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={selectedKeys(this.props.location.pathname)}
                    items={this.getMenuItems()}
                />

                <LanguageSwitcher />
            </>
        );
    }
}

export default connect(mapStateToProps, null)(withRouter(withTranslation()(MenuLayoutSlider)));
