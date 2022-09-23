import React from 'react'
import { Menu, Layout } from "antd";
import {
  MailOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Breadcrumb, PageHeader, Button, Descriptions } from "antd";
const { SubMenu } = Menu;
const { Header, Content } = Layout;
const ContentLayout = (props) => {
  return (
    <Content style={{ padding: "0 50px" }}>
      <div className="site-layout-content">{props.children}</div>
    </Content>
  )
}

export default ContentLayout