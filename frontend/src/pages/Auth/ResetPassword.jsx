import React, { useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { Form, Input, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '../../api/all/user';
import openNotification from '../../components/mini/openNotification';
import { acceptablePassword } from '../../helpers/credentials';

const ResetPassword = () => {
    const { t } = useTranslation();
    const history = useHistory();
    const token = new URLSearchParams(useLocation().search).get('token');
    const [loading, setLoading] = useState(false);

    if (!token) {
        return (
            <div className="loginpage">
                <h1 className="title">{t('auth.reset.title')}</h1>
                <p>{t('auth.reset.missingToken')}</p>
                <Link to="/login">{t('auth.reset.toLogin')}</Link>
            </div>
        );
    }

    const onFinish = async ({ password }) => {
        setLoading(true);
        try {
            const result = await resetPassword(token, password);
            openNotification('success', t('auth.reset.successTitle'), result.message);
            history.push('/login');
        } catch (failure) {
            openNotification('error', t('auth.reset.errorTitle'), (failure && failure.message) || t('common.serverError'));
            setLoading(false);
        }
    };

    return (
        <div className="loginpage">
            <h1 className="title">{t('auth.reset.title')}</h1>
            <Form name="reset_password" className="login-form" layout="vertical" onFinish={onFinish}>
                <Form.Item
                    name="password"
                    label={t('auth.reset.passwordLabel')}
                    rules={[
                        { required: true, message: t('auth.reset.passwordRequired') },
                        {
                            validator: (_, value) => (!value || acceptablePassword(value)
                                ? Promise.resolve()
                                : Promise.reject(new Error(t('auth.reset.passwordLength')))),
                        },
                    ]}
                >
                    <Input.Password prefix={<LockOutlined className="site-form-item-icon" />} />
                </Form.Item>
                <Form.Item
                    name="confirm"
                    label={t('auth.reset.confirmLabel')}
                    dependencies={['password']}
                    rules={[
                        { required: true, message: t('auth.reset.confirmRequired') },
                        ({ getFieldValue }) => ({
                            validator: (_, value) => (!value || getFieldValue('password') === value
                                ? Promise.resolve()
                                : Promise.reject(new Error(t('auth.reset.mismatch')))),
                        }),
                    ]}
                >
                    <Input.Password prefix={<LockOutlined className="site-form-item-icon" />} />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit" className="login-form-button color-green" loading={loading}>
                        {t('auth.reset.submit')}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default ResetPassword;
