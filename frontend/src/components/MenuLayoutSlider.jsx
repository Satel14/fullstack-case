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

class MenuLayoutSlider extends React.Component {
    constructor(props) {
        super(props);
        this.state = {

        }
    }

    getMenuItems = () => {
        const { user } = this.props;
        const defaultMenu = [
            {
                key: 'cases',
                label: <Link to="/">Кейси</Link>,
                icon: <CodeSandboxOutlined />,
            },
            {
                key: 'topplayers',
                label: <Link to="/top">Топ гравців</Link>,
                icon: <BarChartOutlined />,
            },
            {
                key: 'bonus',
                label: <Link to="/bonus">Бонуси</Link>,
                icon: <GiftOutlined />,
            },
            {
                key: 'faq',
                label: <Link to="/article/1">FAQ</Link>,
                icon: <QuestionCircleOutlined />,
            },
            {
                key: 'moneynotenough',
                label: <Link to="/article/8">Ще грошей</Link>,
                icon: <TagsOutlined />,
            },
        ];

        if (!isAuthorized(user)) {
            defaultMenu.push({
                key: '6',
                label: <Link to="/login">Увійти</Link>,
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

                <div className="custom social">
                    <Socials />
                </div>
            </>
        )
    }
}


export default connect(mapStateToProps, null)(MenuLayoutSlider);
