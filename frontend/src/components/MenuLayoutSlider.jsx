import React from 'react';
import { Menu } from 'antd';
import { Link } from 'react-router-dom';
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
} from '@ant-design/icons';

import Socials from './mini/Socials';
import LanguageSwitcher from './LanguageSwitcher';
import { isAuthorized } from '../helpers/Player';

const mapStateToProps = (state) => ({
    user: state.user,
});

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

        if (isAuthorized(user)) {
            defaultMenu.splice(2, 0, {
                key: 'provablyfair',
                label: <Link to="/provably-fair">{t('provablyFair.title')}</Link>,
                icon: <SafetyCertificateOutlined />,
            });
        }

        if (!isAuthorized(user)) {
            defaultMenu.push({
                key: '6',
                label: <Link to="/login">{t('menu.login')}</Link>,
                icon: <UserOutlined />,
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
                    defaultSelectedKeys={['cases']}
                    items={this.getMenuItems()}
                />

                <LanguageSwitcher />

                <div className="custom social">
                    <Socials />
                </div>
            </>
        );
    }
}

export default connect(mapStateToProps, null)(withTranslation()(MenuLayoutSlider));
