/* eslint-disable */
import React, { useState} from 'react'
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import ForgotPassword from "./ForgotPassword";
import { Link } from "react-router-dom";
import { Form, Input, Button, Checkbox } from "antd";
import {userPostFetch} from "../../store/actions/user";
import {connect} from "react-redux";
import openNotification from '../../components/mini/openNotification';
import capitalize from 'lodash/capitalize';
import { useTranslation } from 'react-i18next';


const mapDispatchToProps = (dispatch) => ({
    userPostFetch: (userInfo) => dispatch(userPostFetch(userInfo)),
});
const Login = (props) => {
    const { t } = useTranslation();

    const [loading, setLoading] = useState(false);
    const onFinish = (values) => {
        setLoading(true);
        props.userPostFetch({
                login: values.username,
                password: values.password,
            })
            .then((errMessage) => {
                setLoading(false);
                if (errMessage) {
                    openNotification("error", t('auth.login.errorTitle'), t('auth.login.errorWrong'));
                    return;
                }
                props.history.push("/");
                openNotification(
                    "success",
                    t('auth.login.successTitle'),
                    t('auth.login.welcome', { name: capitalize(values.username) })
                );
            });
    };
    return (
        <div className='loginpage'>
            <h1 className='title'>{t('auth.login.title')}</h1>
            <Form
                name="normal_login"
                className='login-form'
                initialValues={{ remember: true }}
                onFinish={onFinish}
                scrollToFirstError
            >
                <Form.Item
                    name="username"
                    label={t('auth.login.loginLabel')}
                    rules={[
                        { required: true, message: t('auth.login.loginRequired') },
                        { min: 6, message: t('auth.login.minChars')}
                    ]}
                >
                    <Input
                        prefix={<UserOutlined className='site-form-item-icon' />}
                        placeholder={t('auth.login.usernamePlaceholder')} />
                </Form.Item>
                <Form.Item
                    name="password"
                    label={t('auth.login.passwordLabel')}
                    rules={[
                        { required: true, message: t('auth.login.passwordRequired') },
                        { min: 6, message: t('auth.login.minChars')}
                    ]}
                >
                    <Input
                        prefix={<LockOutlined className='site-form-item-icon' />}
                        placeholder={t('auth.login.passwordPlaceholder')}
                        type='password'
                    />
                </Form.Item>
                <Form.Item style={{ marginBottom: "10px" }}>
                    <Form.Item name='remember' valuePropName="checked" noStyle>
                        <Checkbox>{t('auth.login.remember')}</Checkbox>
                    </Form.Item>
                    <ForgotPassword />
                </Form.Item>
                <Form.Item style={{ marginBottom: "15px"}}>
                    <Button
                        type='primary'
                        htmlType='submit'
                        className='login-form-button color-green'
                        loading={loading}
                        style={{ marginRight: "10px"}}
                    >
                        {t('auth.login.submit')}
                    </Button>
                    {t('auth.login.or')}
                    <Link to='/registration'>{t('auth.login.registerLink')}</Link>
                </Form.Item>
            </Form>
        </div>
    )
}

export default connect(null, mapDispatchToProps)(Login);
