import React, { useState } from 'react';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import {
    Form, Input, Button, Checkbox,
} from 'antd';
import { connect } from 'react-redux';
import capitalize from 'lodash/capitalize';
import { useTranslation } from 'react-i18next';
import ForgotPassword from './ForgotPassword';
import { userPostFetch } from '../../store/actions/user';
import { TOKEN_NOT_SAVED } from '../../api/token';
import openNotification from '../../components/mini/openNotification';

const mapDispatchToProps = (dispatch) => ({
    userPostFetch: (userInfo, remember) => dispatch(userPostFetch(userInfo, remember)),
});

const returnToTheAskingPage = (history, location) => {
    const state = (location && location.state) || {};
    if (state.goBack) {
        history.goBack();
        return;
    }
    history.replace(state.from || '/');
};

const Login = (props) => {
    const { t } = useTranslation();

    const [loading, setLoading] = useState(false);
    const failureText = (failure) => {
        if (failure.error === TOKEN_NOT_SAVED) {
            return t('auth.tokenNotSaved');
        }
        if (failure.error === 401) {
            return t('auth.login.errorWrong');
        }
        if (failure.error === 429 && failure.message) {
            return failure.message;
        }
        return t('common.serverError');
    };
    const onFinish = (values) => {
        setLoading(true);
        return props.userPostFetch({
            login: values.username,
            password: values.password,
        }, values.remember !== false)
            .then((failure) => {
                setLoading(false);
                if (failure) {
                    openNotification('error', t('auth.login.errorTitle'), failureText(failure));
                    return undefined;
                }
                returnToTheAskingPage(props.history, props.location);
                openNotification(
                    'success',
                    t('auth.login.successTitle'),
                    t('auth.login.welcome', { name: capitalize(values.username) }),
                );
                return undefined;
            })
            .catch(() => {
                setLoading(false);
                openNotification('error', t('auth.login.errorTitle'), t('common.serverError'));
            });
    };
    return (
        <div className="loginpage">
            <h1 className="title">{t('auth.login.title')}</h1>
            <Form
                name="normal_login"
                className="login-form"
                initialValues={{ remember: true }}
                onFinish={onFinish}
                scrollToFirstError
            >
                <Form.Item
                    name="username"
                    label={t('auth.login.loginLabel')}
                    rules={[
                        { required: true, message: t('auth.login.loginRequired') },
                    ]}
                >
                    <Input
                        prefix={<UserOutlined className="site-form-item-icon" />}
                        placeholder={t('auth.login.usernamePlaceholder')}
                    />
                </Form.Item>
                <Form.Item
                    name="password"
                    label={t('auth.login.passwordLabel')}
                    rules={[
                        { required: true, message: t('auth.login.passwordRequired') },
                    ]}
                >
                    <Input
                        prefix={<LockOutlined className="site-form-item-icon" />}
                        placeholder={t('auth.login.passwordPlaceholder')}
                        type="password"
                    />
                </Form.Item>
                <Form.Item style={{ marginBottom: '10px' }}>
                    <Form.Item name="remember" valuePropName="checked" noStyle>
                        <Checkbox>{t('auth.login.remember')}</Checkbox>
                    </Form.Item>
                    <ForgotPassword />
                </Form.Item>
                <Form.Item style={{ marginBottom: '15px' }}>
                    <Button
                        type="primary"
                        htmlType="submit"
                        className="login-form-button color-green"
                        loading={loading}
                        style={{ marginRight: '10px' }}
                    >
                        {t('auth.login.submit')}
                    </Button>
                    {t('auth.login.or')}
                    <Link to="/registration">{t('auth.login.registerLink')}</Link>
                </Form.Item>
            </Form>
        </div>
    );
};

export default connect(null, mapDispatchToProps)(Login);
