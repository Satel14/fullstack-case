/* eslint-disable no-restricted-syntax */
import React from 'react';
import { Button, Dropdown, Layout, Menu, Tooltip } from 'antd';
import { DollarOutlined, GiftOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import { connect } from 'react-redux';
import { isAuthorized } from '../helpers/Player';
const { Header } = Layout;


const mapStateToProps = (state) => ({
    user: state.user,
})
const menu = (id) => (
    <Menu theme="dark" className="menu-dropdown-profile">
        <Menu.Item key='7' icon={<UserOutlined/>}>
            <Link to={`/profile/${id}`}>Мій профіль</Link>
        </Menu.Item>

        <Menu.Item key='15deposit' icon={<DollarOutlined/>}>
            <Link to="/deposit">Поповнити рахунок</Link>
        </Menu.Item>

        <Menu.Item key='15' icon={<SettingOutlined/>}>
            <Link to="/inventory">Налаштування</Link>
        </Menu.Item>

        <Menu.Item key='7' icon={<UserOutlined/>}>
            <Link to="/settings">Ввести промокод</Link>
        </Menu.Item>

        <Menu.Item key='7' icon={<UserOutlined/>}>
            <Link to="/logout">Вийти</Link>
        </Menu.Item>
    </Menu>
)
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
                                    overlay={menu(user.id)} trigger="click"
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
