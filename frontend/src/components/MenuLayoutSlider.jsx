import React from 'react';
import {Menu} from 'antd';
import {Link} from 'react-router-dom';
import {connect} from 'react-redux'
import {
    QuestionCircleOutlined,
    BarChartOutlined,
    CodeSandboxOutlined,
    GiftOutlined,
    TagsOutlined, UserOutlined
} from '@ant-design/icons';

import Socials from './mini/Socials';
import {isAuthorized} from '../helpers/Player';

const mapStateToProps = (state) => ({
    user: state.user,
});

const defaultMenu = [
    {
        key: 'cases', link: '/', label: "Кейси", icon: <CodeSandboxOutlined/>,
    },
    {
        key: 'topplayers', link: '/top', label: "Топ гравців", icon: <BarChartOutlined/>,
    },
    {
        key: 'bonus', link: '/bonus', label: "Бонуси", icon: <GiftOutlined/>,
    },
    {
        key: 'faq', link: '/article/1', label: "FAQ", icon: <QuestionCircleOutlined/>,
    },
    {
        key: 'moneynotenough', link: '/article/8', label: "Ще грошей", icon: <TagsOutlined/>,
    },
]

class MenuLayoutSlider extends React.Component {
    constructor(props) {
        super(props);
        this.state = {

        }
    }
    render() {
        const {user} = this.props;
        console.log(user);
        return (
            <>
                <Menu theme="dark" mode="inline" defaultSelectedKeys={['cases']}>
                    {defaultMenu.map((menu) => (
                        <Menu.Item key={menu.key} icon={menu.icon}>
                            <Link to={menu.link}>{menu.label}</Link>
                        </Menu.Item>
                    ))}
                    {!isAuthorized(user) && (
                        <Menu.Item key="6" icon={<UserOutlined/>}>
                            <Link to='/login'>Увійти</Link>
                        </Menu.Item>
                    )}
                </Menu>

                <div className="custom social">
                    <Socials />
                </div>
            </>
        )
    }
}


export default connect(mapStateToProps, null)(MenuLayoutSlider);
