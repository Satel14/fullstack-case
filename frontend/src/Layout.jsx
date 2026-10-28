import React from 'react';
import { Drawer, Layout } from 'antd';
import { withRouter } from 'react-router-dom';
import ContentLayout from './components/ContentLayout';
import MenuLayoutSlider from './components/MenuLayoutSlider';
import HeaderSecond from './components/HeaderSecond';
import FooterLayout from './components/FooterLayout';
import HeaderThird from './components/HeaderThird';
import ConnectedChat from './components/chat/Chat';
import SiteLogo from './components/SiteLogo';
import useMediaQuery from './helpers/useMediaQuery';
import { SCREEN_LG, SCREEN_MD, SCREEN_XL } from './config/breakpoints';

const { Sider, Content } = Layout;

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      collapsed: localStorage.getItem('menuCollapse') === 'true',
      collapsedChat: localStorage.getItem('collapsedChat') === 'true',
      menuOpen: false,
      chatOpen: false,
    };

    window.Layout = this;
  }

  componentDidMount() {
    window.HeaderSecond.chatButtonStatusHeader(this.chatHidden());
  }

  componentDidUpdate(prevProps) {
    const { location, dockedMenu, dockedChat } = this.props;
    if (this.state.menuOpen && (prevProps.location.pathname !== location.pathname || (dockedMenu && !prevProps.dockedMenu))) {
      this.setState({ menuOpen: false });
    }
    if (this.state.chatOpen && dockedChat && !prevProps.dockedChat) {
      this.setState({ chatOpen: false });
    }
    if (prevProps.dockedChat !== dockedChat) {
      window.HeaderSecond.chatButtonStatusHeader(this.chatHidden());
    }
  }

  onCollapse(collapsed) {
    this.setState({ collapsed });
    localStorage.setItem('menuCollapse', collapsed);
  }

  onCollapseChat(collapsedChat) {
    if (!this.props.dockedChat) {
      this.setState({ chatOpen: !collapsedChat });
      window.HeaderSecond.chatButtonStatusHeader(collapsedChat);
      return;
    }
    this.setState({ collapsedChat });
    window.HeaderSecond.chatButtonStatusHeader(collapsedChat);
    localStorage.setItem('collapsedChat', collapsedChat);
  }

  chatHidden() {
    return this.props.dockedChat ? this.state.collapsedChat : !this.state.chatOpen;
  }

  render() {
    const {
      collapsed, collapsedChat, menuOpen, chatOpen,
    } = this.state;
    const { dockedMenu, dockedChat, fullScreenChat } = this.props;
    const menu = (
      <>
        <SiteLogo />
        <MenuLayoutSlider />
      </>
    );

    return (
      <Layout style={{ minHeight: '100vh' }}>
        {dockedMenu ? (
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
              left: 0,
            }}
          >
            {menu}
          </Sider>
        ) : (
          <Drawer
            placement="left"
            open={menuOpen}
            onClose={() => this.setState({ menuOpen: false })}
            closable={false}
            width={260}
            className="menu-drawer"
            bodyStyle={{ padding: 0 }}
          >
            {menu}
          </Drawer>
        )}

        <Layout className="site-layout">
          <Layout>
            <Content className="layout-content-max">
              <HeaderSecond onOpenMenu={dockedMenu ? null : () => this.setState({ menuOpen: true })} />
              <HeaderThird />
              <ContentLayout>{this.props.children}</ContentLayout>
              <FooterLayout />
            </Content>
            {dockedChat ? (
              <Sider
                collapsible
                collapsed={collapsedChat}
                onCollapse={(e) => this.onCollapseChat(e)}
                className="slider-right"
                width={360}
                trigger={null}
                collapsedWidth={0}
              >
                <ConnectedChat enabled={!collapsedChat} />
              </Sider>
            ) : (
              <Drawer
                placement="right"
                open={chatOpen}
                onClose={() => this.onCollapseChat(true)}
                closable={false}
                width={fullScreenChat ? '100%' : 360}
                className="chat-drawer"
                bodyStyle={{ padding: 0 }}
              >
                <ConnectedChat enabled={chatOpen} />
              </Drawer>
            )}
          </Layout>
        </Layout>
      </Layout>
    );
  }
}

const RoutedApp = withRouter(App);

export default function ResponsiveLayout({ children }) {
  const dockedMenu = useMediaQuery(SCREEN_LG);
  const dockedChat = useMediaQuery(SCREEN_XL);
  const fullScreenChat = !useMediaQuery(SCREEN_MD);

  return (
    <RoutedApp dockedMenu={dockedMenu} dockedChat={dockedChat} fullScreenChat={fullScreenChat}>
      {children}
    </RoutedApp>
  );
}
