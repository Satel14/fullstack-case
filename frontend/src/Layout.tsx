import React from "react";
import {
  MailOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  Layout,
  Breadcrumb,
  Menu,
  PageHeader,
  Button,
  Descriptions,
} from "antd";
import HeaderLayout from "./components/HeaderLayout";
import HeaderSecond from "./components/HeaderSecond";
const { SubMenu } = Menu;
const { Content, Footer } = Layout;
export default class App extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {
      fetching: 0,
    };
  }

  render() {
    return (
    <>
        <Layout className="layout">
          <HeaderLayout />
          <HeaderSecond />
          <Content style={{ padding: "0 50px" }}>
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Головна</Breadcrumb.Item>
              <Breadcrumb.Item>Кейси</Breadcrumb.Item>
            </Breadcrumb>

            <div className="site-page-header-ghost-wrapper">
              <PageHeader
                ghost={false}
                onBack={() => window.history.back()}
                title="Title"
                subTitle="This is a subtitle"
                extra={[
                  <Button key="3">Operation</Button>,
                  <Button key="2">Operation</Button>,
                  <Button key="1" type="primary">
                    Primary
                  </Button>,
                ]}
              ></PageHeader>
            </div>
            <div className="site-layout-content">{this.props.children}</div>
          </Content>
          <Footer style={{ textAlign: "center" }}>Case 2022</Footer>
        </Layout>
      </>
    );
  }
}
