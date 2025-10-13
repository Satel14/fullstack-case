/* eslint-disable no-restricted-syntax */
import React from 'react';
import { Button, Dropdown, Layout, Tooltip } from 'antd';
import { DollarOutlined, GiftOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import { connect } from 'react-redux';
import { isAuthorized } from '../helpers/Player';
const { Header } = Layout;


const mapStateToProps = (state) => ({
    user: state.user,
})

const getMenuItems = (id) => ({
    items: [
        {
            key: '7',
            label: <Link to={`/profile/${id}`}>Мій профіль</Link>,
            icon: <UserOutlined />,
        },
        {
            key: '15deposit',
            label: <Link to="/deposit">Поповнити рахунок</Link>,
            icon: <DollarOutlined />,
        },
        {
            key: '15',
            label: <Link to="/inventory">Налаштування</Link>,
            icon: <SettingOutlined />,
        },
        {
            key: '8',
            label: <Link to="/settings">Ввести промокод</Link>,
            icon: <UserOutlined />,
        },
        {
            key: '9',
            label: <Link to="/logout">Вийти</Link>,
            icon: <UserOutlined />,
        },
    ],
    theme: "dark",
    className: "menu-dropdown-profile",
})
class HeaderSecond extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            balance: this.props.user.balance,
            onlineUser: {old: 0, new: 0}
        };
        window.HeaderSecond = this;
    }

    changeBalance(balance) {
        this.setState({
            balance,
        })
    }

    chatButtonStatusHeader(status) {
        this.setState({
            chatButton: status
        })
    }

    renderUserList() {
        const arr = [];
        const { onlineUserList } = this.state;
        if (onlineUserList && !onlineUserList.length) {
            return <></>
        }

        for (const key in onlineUserList) {
            if (Object.hasOwnProperty.call(onlineUserList, key)) {
                const element = onlineUserList[key];
                console.log(element.user_login);
                arr.push(<div>{element.user_login}</div>)
            }
        }

        return arr;
    }
    render() {
        const { user } = this.props;
        const {chatButton, onlineUser} = this.state;

        return (
            <Header
                className="headersecond"
                style={{ borderBottom: '1px #22262f solid' }}
            >
                <div className="headersecond-leftblock flex">
                    <div className="headersecond-stats">
                        <div className="headersecond-stats__opened" />
                        <div className="headersecond-stats__block">
                            <i>
                                <CountUp start={5} end={100}/>
                            </i>
                            <span>Відкрито кейсів</span>
                        </div>
                    </div>

                    <div className="headersecond-stats">
                        <div className="headersecond-stats__users" />
                        <div className="headersecond-stats__block">
                            <i>
                                <CountUp start={50} end={3023}/>
                            </i>
                            <span>Користувачів</span>
                        </div>
                    </div>

                    <div className="headersecond-stats">
                        <div className="headersecond-stats__online" />
                        <div className="headersecond-stats__block">
                            <i>
                                <CountUp start={100} end={555}/>
                            </i>
                            <span>Виведено предметів</span>
                        </div>
                    </div>

                    <div className="headersecond-stats">
                        <div className="headersecond-stats__online" />
                        <div className="headersecond-stats__block">
                            <i>
                                <CountUp start={onlineUser.old} end={onlineUser.new + 1}/>
                            </i>
                            <Tooltip placement="bottom" title={this.renderUserList()}>
                            <span>Онлайн</span>
                            </Tooltip>
                        </div>
                    </div>

                    <div className="headersecond-stats custom">
                        <GiftOutlined />
                        <div className="headersecond-stats__block">
                            <i>Бонуси</i>
                            <span>Розіграші, роздачі</span>
                        </div>
                    </div>

                    <div className="headersecond-rightblock flex"
                    style={{alignItems: 'center'}}
                    >
                        {chatButton && (
                            <Button
                            className="color-white small"
                            style={{ marginRight: "15px"}}
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
                                        menu={getMenuItems(user.id)}
                                        trigger={["click"]}
                                    >
                                        <Link to={`/profile/${user.id}`}>
                                            <div className="headersecond-profile__avatar"
                                                style={{
                                                    backgroundImage: `url(/img/avatars/${user.avatar}.png)`,
                                            }}
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
                </div>
            </Header>
        );
    }
}

export default connect(mapStateToProps, null)(HeaderSecond)
