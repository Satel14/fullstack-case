import React from 'react';
import {
    Layout, Menu, Tooltip, Popover, Badge,
} from 'antd';
import { Link } from 'react-router-dom';
import {
    QuestionCircleOutlined,
    UserOutlined,
    BarChartOutlined,
    NotificationOutlined,
    SettingOutlined,
} from '@ant-design/icons';

const { Header } = Layout;
// const { SubMenu } = Menu;

const text = <span>Останнє повідомлення</span>;
const content = (
    <div>
        <p>Новини</p>
        <p>Новий кейс</p>
    </div>
);
const HeaderLayout = () => (
    <Header className="headertop">
        <Menu theme="dark" mode="horizontal" defaultSelectedKeys={['1']}>
            <Menu.Item key="1" className="headertop-sitename">
                <Link to="/">Case</Link>
            </Menu.Item>
            <Menu.Item key="8" icon={<BarChartOutlined />}>
                <Link to="/article/1">Топ гравців</Link>
            </Menu.Item>
            <Menu.Item key="2" icon={<QuestionCircleOutlined />}>
                <Link to="/article/1">FAQ</Link>
            </Menu.Item>
            <Menu.Item key="3" icon={<UserOutlined />}>
                <Link to="/login">Увійти</Link>
            </Menu.Item>
            <Menu.Item
                key="7"
                className="headertop-profile"
                icon={(
                    <div
                        className="headertop-profile__avatar"
                        style={{
                            backgroundImage: 'url(/img/avatars/6.png)',
                        }}
                    />
                )}
            >
                <Link to="/profile/1">
                    Satel
                    <span className="credits">52321</span>
                </Link>
                <Tooltip placement="right" title="Налаштування профіля">
                    <Link to="/settings" className="headerprofile-settings">
                        <SettingOutlined />
                    </Link>
                </Tooltip>
            </Menu.Item>
            <Menu.Item
                key="7"
                className="headertop-notification"
                icon={(
                    <Popover
                        placement="bottom"
                        title={text}
                        content={content}
                        trigger="click"
                    >
                        <Badge count={2} style={{ backgroundColor: '#f51417' }}>
                            <NotificationOutlined />
                        </Badge>
                    </Popover>
                )}
            >
                Сповіщення
            </Menu.Item>
        </Menu>
    </Header>
);

export default HeaderLayout;
