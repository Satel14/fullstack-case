/* eslint-disable-next-line react/no-children-prop */
import React from "react";
import {Layout, BackTop} from "antd";
import ContentLayout from "./components/ContentLayout";
import MenuLayoutSlider from "./components/MenuLayoutSlider";
import HeaderSecond from "./components/HeaderSecond";
import FooterLayout from "./components/FooterLayout";
import HeaderThird from './components/HeaderThird'
import { Link } from 'react-router-dom';

const { Sider, Content } = Layout;
export default class App extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {
      fetching: 0,
    };
  }

  render() {
    return (
      <Layout style={{minHeight: '100vh'}}>
          <Sider
          collapsible
          width={220}
          className="slider-left"
          style={{
              overflow: 'auto',
              height: '100vh',
              position: 'sticky',
              top: 0,
              left: 0
          }}
          >
              <div className="header-sitename">
                    <div className="header-sitename__beta">CS</div>
                  <Link to="/">
                        <div className="low">GO</div>
                        <div className="full">CASES</div>
                      <span>ua</span>
                  </Link>
              </div>
              <MenuLayoutSlider/>
          </Sider>
          <Layout className="site-layout">
              <Layout>
                  <Content className="layout-content-max">
                      <HeaderSecond />
                      <HeaderThird/>
                      <ContentLayout children={this.props.children as React.ReactElement} />
                      <FooterLayout />
                      <BackTop className="buttontotop"/>
                  </Content>
              </Layout>
          </Layout>
      </Layout>
    );
  }
}
