import React from 'react';
import { Layout } from 'antd';
import PropTypes from 'prop-types';
// import {
//     MailOutlined,
//     AppstoreOutlined,
//     SettingOutlined,
// } from "@ant-design/icons";
// import { Breadcrumb, PageHeader, Button, Descriptions } from "antd";
// const { SubMenu } = Menu;
const { Content } = Layout;
const ContentLayout = ({ children }) => (
    <Content style={{ padding: '25px' }}>
        <div className="site-layout-content">
            {children}
        </div>
    </Content>
);
ContentLayout.propTypes = {
    children: PropTypes.element,
};

ContentLayout.defaultProps = {
    children: 'Main page',
};
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

export default ContentLayout;
