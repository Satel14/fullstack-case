/* eslint-disable-next-line react/no-children-prop */
import React from "react";
import {Layout, Button} from "antd";
import ContentLayout from "./components/ContentLayout";
import MenuLayoutSlider from "./components/MenuLayoutSlider";
import HeaderSecond from "./components/HeaderSecond";
import FooterLayout from "./components/FooterLayout";
import HeaderThird from './components/HeaderThird'
import Chat from './components/chat/Chat'
import { Link } from 'react-router-dom';

const { Sider, Content } = Layout;
export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
        collapsed: false,
      collapsedChat: true
    };

    window.Layout = this;
  }

  async componentDidMount() {
      const collapsed = await localStorage.getItem('menuCollapse');
      const collapsedChat = await localStorage.getItem('collapsedChat');
      const isCollapsed = collapsed === 'true';
      const isCollapsedChat = collapsedChat === true;

      this.setState({
          collapsed: isCollapsed || false,
          collapsedChat: isCollapsedChat || false
      })

      window.HeaderSecond.chatButtonStatusHeader(isCollapsedChat);
  }

    onCollapse(collapsed) {
      this.setState({collapsed});
      localStorage.setItem('menuCollapse', collapsed)
    }

  onCollapseChat(collapsedChat) {
      this.setState({collapsedChat});
      window.HeaderSecond.chatButtonStatusHeader(collapsedChat);
      localStorage.setItem('collapsedChat', collapsedChat)
  }

  render() {
    const {collapsed, collapsedChat} = this.state;

    return (
      <Layout style={{minHeight: '100vh'}}>
          <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(e) => this.onCollapse(e)}
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
                      <ContentLayout children={this.props.children} />
                      <FooterLayout />
                  </Content>
                  <Sider
                      collapsible
                      collapsed={collapsedChat}
                      onCollapse={(e) => this.onCollapseChat(e)}
                      className="slider-right"
                      width={360}
                      trigger={(
                          <Button className="openchat-button color-red">
                              Закрити чат
                          </Button>
                      )}
                      collapsedWidth={0}
                  >
                      <Chat enabled={!collapsedChat}/>
                  </Sider>
              </Layout>
          </Layout>
      </Layout>
    );
  }
}
