import React from 'react'
import { Layout, Menu } from "antd";
import { Link } from "react-router-dom";
import {
    CodeSandboxOutlined,
    QuestionCircleOutlined,
    UserOutlined,
} from "@ant-design/icons";
const { Header } = Layout;
const HeaderLayout = () => {
    return (
        <Header className="headertop">
            <div className='logo' />
            <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["1"]}>
                <Menu.Item key='1' className='headertop-sitename' icon={<div className='logo' />}>
                    <Link to="/">Case</Link>
                </Menu.Item>
                <Menu.Item key='2' icon={<CodeSandboxOutlined />}>
                    <Link to='/'>Кейси</Link>
                </Menu.Item>
                <Menu.Item key='3' icon={<QuestionCircleOutlined />}>
                    <Link to="/article/1">FAQ</Link>
                </Menu.Item>
                <Menu.Item key='4' icon={<UserOutlined />}>
                    <Link to="/login">Увійти</Link>
                </Menu.Item>
                <Menu.Item key='5' icon={<UserOutlined className='headertop-profile'/>}>
                    <Link to="/myprofile">Satel</Link>
                    <span className='credits'>52321</span>
                </Menu.Item>
            </Menu>
        </Header>
    )
}

export default HeaderLayout