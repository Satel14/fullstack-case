import React from 'react'
import { Layout, Menu } from "antd";

const { Header } = Layout;
const HeaderLayout = () => {
    return (
        <Header>
            <div className='logo' />
            <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["2"]}>
                <Menu.Item key='1'>Кейси</Menu.Item>
                <Menu.Item key='2'>FAQ</Menu.Item>
                <Menu.Item key='3'>Мій профіль/Авторизуватися</Menu.Item>
            </Menu>
        </Header>
    )
}

export default HeaderLayout