import React from "react";
import {
  Layout,
} from "antd";
import ContentLayout from "./components/ContentLayout";
import HeaderLayout from "./components/HeaderLayout";
import HeaderSecond from "./components/HeaderSecond";
import FooterLayout from "./components/FooterLayout";
import HeaderThird from './components/HeaderThird'
export default class App extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {
      fetching: 0,
    };
  }

  render() {
    return (
      <Layout className="layout container">
        <HeaderLayout />
        <HeaderThird/>
        <HeaderSecond />
        <ContentLayout children={this.props.children} />
        <FooterLayout />
      </Layout>
    );
  }
}
