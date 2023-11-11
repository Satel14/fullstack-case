/* eslint-disable no-restricted-syntax */
import React from 'react';
import { Layout, Menu } from 'antd';
import { DollarOutlined, GiftOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import { connect } from 'react-redux';
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
        };
        window.HeaderSecond = this;
    }

    changeBalance(balance) {
        this.setState({
            balance,
        })
    }
    render() {
        const { user } = this.props;

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
                                <CountUp start={20} end={150}/>
                            </i>
                            <span>Онлайн</span>
                        </div>
                    </div>

                    <div className="headersecond-stats custom">
                        <GiftOutlined />
                        <div className="headersecond-stats__block">
                            <i>Бонуси</i>
                            <span>Розіграші, роздачі</span>
                        </div>
                    </div>
                </div>
            </Header>
        );
    }
}

export default connect(mapStateToProps, null)(HeaderSecond)
