import React, { Component } from 'react';
import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { withTranslation } from 'react-i18next';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { failed: false, resetKey: props.resetKey };
    }

    static getDerivedStateFromProps(props, state) {
        if (props.resetKey !== state.resetKey) {
            return { failed: false, resetKey: props.resetKey };
        }
        return null;
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error, info) {
        console.error('A page crashed:', error, info && info.componentStack);
    }

    render() {
        const { failed } = this.state;
        const { children, t } = this.props;
        if (!failed) {
            return children;
        }
        return (
            <div className="crashpage" role="alert">
                <h2>{t('crash.title')}</h2>
                <p>{t('crash.text')}</p>
                <Button type="primary" icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
                    {t('crash.reload')}
                </Button>
                <a href="/">{t('error.goHome')}</a>
            </div>
        );
    }
}

export default withTranslation()(ErrorBoundary);
