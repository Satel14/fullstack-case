import React from 'react'
import { Menu, Layout } from "antd";
// import {
//     MailOutlined,
//     AppstoreOutlined,
//     SettingOutlined,
// } from "@ant-design/icons";
// import { Breadcrumb, PageHeader, Button, Descriptions } from "antd";
// const { SubMenu } = Menu;
const { Header, Content } = Layout;
const ContentLayout = (props) => {
    return (
        <Content style={{ padding: "25px" }}>
            <div className="site-layout-content">{props.children}
            </div>
        </Content>
    )
}

// <PageHeader
//     ghost={false}
//     onBack={() => window.history.back()}
//     title="Назад"
//     subTitle=""
//     extra={
//         [
//             /*
//                   <Breadcrumb style={{ margin: "16px 0" }}>
//       <Breadcrumb.Item>Головна</Breadcrumb.Item>
//       <Breadcrumb.Item>Кейси</Breadcrumb.Item>
//     </Breadcrumb>
//           <Button key="3">Operation</Button>,
//           <Button key="2">Operation</Button>,
//           <Button key="1" type="primary">
//             Primary
//           </Button>,*/
//         ]
//     }
// ></PageHeader>

export default ContentLayout