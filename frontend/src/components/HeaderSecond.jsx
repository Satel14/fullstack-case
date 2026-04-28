/* eslint-disable no-restricted-syntax */
import React from 'react';
import { Button, Dropdown, Layout, Tooltip } from 'antd';
import { DollarOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import { connect } from 'react-redux';
import { isAuthorized } from '../helpers/Player';
import { logoutProfile } from '../store/actions/user';
import { API_URL } from '../api/config';

const { Header } = Layout;

const mapStateToProps = (state) => ({
    user: state.user,
});

const mapDispatchToProps = (dispatch) => ({
    logoutUser: () => dispatch(logoutProfile()),
});

class HeaderSecond extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            balance: this.props.user.balance,
            onlineUser: { old: 0, new: 0 },
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
        window.HeaderSecond = this;
    }

    async componentDidMount() {
        this.fetchStats();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.user.balance !== this.props.user.balance) {
            this.setState({ balance: this.props.user.balance });
        }
    }

    async fetchStats() {
        try {
            const response = await fetch(`${API_URL}/stats`);
            const data = await response.json();
            if (data.status === 200) {
                this.setState((prevState) => ({
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
        this.setState({
            balance,
        });
    }

    chatButtonStatusHeader(status) {
        this.setState({
            chatButton: status,
        });
    }

    renderUserList() {
        const arr = [];
        const { onlineUserList } = this.state;
        if (onlineUserList && !onlineUserList.length) {
            return <></>;
        }

        for (const key in onlineUserList) {
            if (Object.hasOwnProperty.call(onlineUserList, key)) {
                const element = onlineUserList[key];
                arr.push(<div>{element.user_login}</div>);
            }
        }

        return arr;
    }

    render() {
        const { user } = this.props;
        const { chatButton, onlineUser, stats } = this.state;
        const profileMenuItems = [
            {
                key: '7',
                icon: <UserOutlined />,
                label: <Link to={`/profile/${user.id}`}>Мій профіль</Link>,
            },
            {
                key: '15deposit',
                icon: <DollarOutlined />,
                label: <Link to="/deposit">Поповнити рахунок</Link>,
            },
            {
                key: '15',
                icon: <SettingOutlined />,
                label: <Link to="/settings">Налаштування</Link>,
            },
            {
                key: '8',
                icon: <UserOutlined />,
                label: <Link to="/settings">Ввести промокод</Link>,
            },
            {
                key: 'logout',
                icon: <UserOutlined />,
                label: 'Вийти',
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
                            <span>Відкрито кейсів</span>
                        </div>
                    </div>

                    <div className="headersecond-stats">
                        <div className="headersecond-stats__users" />
                        <div className="headersecond-stats__block">
                            <i>
                                <CountUp start={stats.userCountsOld} end={stats.userCounts} />
                            </i>
                            <span>Користувачів</span>
                        </div>
                    </div>

                    <div className="headersecond-stats">
                        <div className="headersecond-stats__online" />
                        <div className="headersecond-stats__block">
                            <i>
                                <CountUp start={stats.receivedItemsOld} end={stats.receivedItems} />
                            </i>
                            <span>Виведено предметів</span>
                        </div>
                    </div>

                    <div className="headersecond-stats">
                        <div className="headersecond-stats__online" />
                        <div className="headersecond-stats__block">
                            <i>
                                <CountUp start={onlineUser.old} end={onlineUser.new + 1} />
                            </i>
                            <Tooltip placement="bottom" title={this.renderUserList()}>
                                <span>Онлайн</span>
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
                            Чат
                        </Button>
                    )}
                    {isAuthorized(user) && (
                        <>
                            <Link to="/deposit">
                                <Button size="small" className="color-pink">
                                    Поповнити
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
                                            <span className="balance">{this.state.balance}</span>
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

export default connect(mapStateToProps, mapDispatchToProps)(HeaderSecond);
