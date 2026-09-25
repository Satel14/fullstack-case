import React from 'react';
import { Button, Dropdown, Layout, Tooltip } from 'antd';
import { DollarOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { isAuthorized } from '../helpers/Player';
import { logoutProfile, updateBalance } from '../store/actions/user';
import { API_URL } from '../api/config';
import { default as socket } from '../api/all/ws';

const { Header } = Layout;

const mapStateToProps = (state) => ({
    user: state.user,
});

const mapDispatchToProps = (dispatch) => ({
    logoutUser: () => dispatch(logoutProfile()),
    updateBalance: (balance) => dispatch(updateBalance(balance)),
});

class HeaderSecond extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            onlineUser: { old: 0, new: 0 },
            onlineUserList: [],
            chatButton: false,
            stats: {
                openedCases: 5,
                openedCasesOld: 0,
                userCounts: 50,
                userCountsOld: 0,
                receivedItems: 100,
                receivedItemsOld: 0,
            },
        };
        this.fetchStats = this.fetchStats.bind(this);
        window.HeaderSecond = this;
    }

    async componentDidMount() {
        socket.on('connect', this.fetchStats);
        this.fetchStats();
    }

    componentWillUnmount() {
        socket.off('connect', this.fetchStats);
    }

    async fetchStats() {
        try {
            const response = await fetch(`${API_URL}/stats`);
            const data = await response.json();
            if (data.status === 200) {
                this.setState((prevState) => ({
                    onlineUser: {
                        old: prevState.onlineUser.new,
                        new: Number(data.data.onlineUser) || 0,
                    },
                    onlineUserList: Array.isArray(data.data.onlineUserList) ? data.data.onlineUserList : [],
                    stats: {
                        openedCasesOld: prevState.stats.openedCases,
                        openedCases: data.data.openedCases,
                        userCountsOld: prevState.stats.userCounts,
                        userCounts: data.data.userCounts,
                        receivedItemsOld: prevState.stats.receivedItems,
                        receivedItems: data.data.receivedItems,
                    },
                }));
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }

    changeBalance(balance) {
        this.props.updateBalance(balance);
    }

    chatButtonStatusHeader(status) {
        this.setState({
            chatButton: status,
        });
    }

    renderUserList() {
        const { onlineUserList } = this.state;
        if (!onlineUserList.length) {
            return null;
        }

        return onlineUserList.map((onlineUser) => (
            <div key={onlineUser.user_id}>{onlineUser.user_login}</div>
        ));
    }

    render() {
        const { user, t } = this.props;
        const { chatButton, onlineUser, stats } = this.state;
        const profileMenuItems = [
            {
                key: '7',
                icon: <UserOutlined />,
                label: <Link to={`/profile/${user.id}`}>{t('header.profile')}</Link>,
            },
            {
                key: '15deposit',
                icon: <DollarOutlined />,
                label: <Link to="/deposit">{t('header.depositAccount')}</Link>,
            },
            {
                key: '15',
                icon: <SettingOutlined />,
                label: <Link to="/settings">{t('header.settings')}</Link>,
            },
            {
                key: '8',
                icon: <UserOutlined />,
                label: <Link to="/promocode">{t('header.promocode')}</Link>,
            },
            {
                key: 'logout',
                icon: <UserOutlined />,
                label: t('header.logout'),
                onClick: () => this.props.logoutUser(),
            },
        ];

        return (
            <Header className="headersecond" style={{ borderBottom: '1px #22262f solid' }}>
                <div className="headersecond-leftblock flex">
                    <div className="headersecond-stats">
                        <div className="headersecond-stats__opened" />
                        <div className="headersecond-stats__block">
                            <i>
                                <CountUp start={stats.openedCasesOld} end={stats.openedCases} />
                            </i>
                            <span>{t('header.stats.openedCases')}</span>
                        </div>
                    </div>

                    <div className="headersecond-stats">
                        <div className="headersecond-stats__users" />
                        <div className="headersecond-stats__block">
                            <i>
                                <CountUp start={stats.userCountsOld} end={stats.userCounts} />
                            </i>
                            <span>{t('header.stats.users')}</span>
                        </div>
                    </div>

                    <div className="headersecond-stats">
                        <div className="headersecond-stats__online" />
                        <div className="headersecond-stats__block">
                            <i>
                                <CountUp start={stats.receivedItemsOld} end={stats.receivedItems} />
                            </i>
                            <span>{t('header.stats.withdrawnItems')}</span>
                        </div>
                    </div>

                    <div className="headersecond-stats">
                        <div className="headersecond-stats__online" />
                        <div className="headersecond-stats__block">
                            <i>
                                <CountUp start={onlineUser.old} end={onlineUser.new} />
                            </i>
                            <Tooltip placement="bottom" title={this.renderUserList()}>
                                <span>{t('header.stats.online')}</span>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                <div className="headersecond-rightblock flex" style={{ alignItems: 'center' }}>
                    {chatButton && (
                        <Button
                            className="color-white small"
                            style={{ marginRight: '15px' }}
                            onClick={() => window.Layout.onCollapseChat(false)}
                        >
                            {t('header.chat')}
                        </Button>
                    )}
                    {isAuthorized(user) && (
                        <>
                            <Link to="/deposit">
                                <Button size="small" className="color-pink">
                                    {t('header.deposit')}
                                </Button>
                            </Link>
                            <div className="headersecond-profile">
                                <Dropdown
                                    menu={{
                                        items: profileMenuItems,
                                        theme: 'dark',
                                        className: 'menu-dropdown-profile',
                                    }}
                                    trigger={['click']}
                                >
                                    <Link to={`/profile/${user.id}`}>
                                        <div
                                            className="headersecond-profile__avatar"
                                            style={{ backgroundImage: `url(/img/avatars/${user.avatar}.png)` }}
                                        />
                                        <div className="headersecond-profile__info">
                                            <span className="nickname">{user.login}</span>
                                            <span className="balance">{user.balance}</span>
                                        </div>
                                    </Link>
                                </Dropdown>
                            </div>
                        </>
                    )}
                </div>
            </Header>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(HeaderSecond));
