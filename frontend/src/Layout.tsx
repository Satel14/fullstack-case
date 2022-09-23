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
import ContentLayout from "./components/ContentLayout";
import HeaderLayout from "./components/HeaderLayout";
import HeaderSecond from "./components/HeaderSecond";
import FooterLayout from "./components/FooterLayout";
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
          <ContentLayout />
          <FooterLayout />
          <Footer style={{ textAlign: "center" }}>Case 2022</Footer>
        </Layout>
      </>
    );
  }
}
