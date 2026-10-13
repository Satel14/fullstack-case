import React, { useState } from 'react';
import {
    Form,
    Input,
    Checkbox,
    Button,
    Radio,
} from 'antd';
import { connect } from 'react-redux';
import capitalize from 'lodash/capitalize';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { userPostRegisterFetch } from '../../store/actions/user';
import openNotification from '../../components/mini/openNotification';
import { LOGIN_PATTERN, acceptablePassword, acceptableEmail } from '../../helpers/credentials';
import { clientErrorMessage } from '../../helpers/serverMessage';

const formItemLayout = {
    labelCol: {
        xs: { span: 8 },
        sm: { span: 8 },
    },
    wrapperCol: {
        xs: { span: 9 },
        sm: { span: 9 },
    },
};
const tailFormItemLayout = {
    wrapperCol: {
        xs: {
            span: 24,
            offset: 0,
        },
        sm: {
            span: 16,
            offset: 8,
        },
    },
};

const Images = [
    { url: './img/avatars/1.png', id: 1 },
    { url: './img/avatars/2.png', id: 2 },
    { url: './img/avatars/3.png', id: 3 },
    { url: './img/avatars/4.png', id: 4 },
    { url: './img/avatars/5.png', id: 5 },
    { url: './img/avatars/6.png', id: 6 },
];

const mapDispatchToProps = (dispatch) => ({
    userPostRegisterFetch: (userInfo) => dispatch(userPostRegisterFetch(userInfo)),
});
const Registration = (props) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [avatar, setAvatar] = useState(1);
    const [loading, setLoading] = useState(false);
    const [sentTo, setSentTo] = useState('');

    const onFinish = (values) => {
        setLoading(true);
        return props.userPostRegisterFetch({
            login: values.username,
            password: values.password,
            email: values.email,
            avatar,
        }).then((result) => {
            setLoading(false);
            if (result && result.status === 'confirm-email') {
                setSentTo(values.email.trim());
                return undefined;
            }
            if (result) {
                openNotification('error', t('auth.register.errorTitle'), clientErrorMessage(result) || t('common.serverError'));
                return undefined;
            }
            props.history.push('/');
            openNotification('success', t('auth.register.successTitle'), t('auth.register.welcome', { name: capitalize(values.username) }));
            return undefined;
        }).catch(() => {
            setLoading(false);
            openNotification('error', t('auth.register.errorTitle'), t('common.serverError'));
        });
    };

    if (sentTo) {
        return (
            <div className="registrationpage">
                <h1 className="title">{t('auth.confirm.sentTitle')}</h1>
                <p>{t('auth.confirm.sentText', { email: sentTo })}</p>
                <p>{t('auth.confirm.sentHint')}</p>
                <Link to="/">{t('auth.confirm.toHome')}</Link>
            </div>
        );
    }

    return (
        <div className="registrationpage">
            <h1 className="title">{t('auth.register.title')}</h1>
            <Form
                labelCol={formItemLayout.labelCol}
                wrapperCol={formItemLayout.wrapperCol}
                form={form}
                name="register"
                onFinish={onFinish}
                scrollToFirstError
            >
                <Form.Item
                    name="username"
                    label={t('auth.register.loginLabel')}
                    rules={[
                        {
                            required: true,
                            message: t('auth.register.loginRequired'),
                            whitespace: true,
                        },
                        {
                            pattern: LOGIN_PATTERN,
                            message: t('auth.register.loginInvalid'),
                        },
                    ]}
                    hasFeedback
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name="password"
                    label={t('auth.register.passwordLabel')}
                    rules={[
                        {
                            required: true,
                            message: t('auth.register.passwordRequired'),
                        },
                        {
                            validator: (_, value) => (!value || acceptablePassword(value)
                                ? Promise.resolve()
                                : Promise.reject(new Error(t('auth.register.passwordLength')))),
                        },
                    ]}
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item
                    name="confirm"
                    label={t('auth.register.confirmLabel')}
                    dependencies={['password']}
                    hasFeedback
                    rules={[
                        {
                            required: true,
                            message: t('auth.register.confirmRequired'),
                        },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error(t('auth.register.confirmMismatch')));
                            },
                        }),
                    ]}
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item
                    name="email"
                    label={t('auth.register.emailLabel')}
                    normalize={(value) => (value || '').trim()}
                    rules={[
                        {
                            validator: (_, value) => (!value || acceptableEmail(value)
                                ? Promise.resolve()
                                : Promise.reject(new Error(t('auth.register.emailInvalid')))),
                        },
                        {
                            required: true,
                            message: t('auth.register.emailRequired'),
                        },
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item label={t('auth.register.chooseAvatar')}>
                    <Radio.Group defaultValue={avatar} buttonStyle="solid">
                        {Images.map((item) => (
                            <Radio.Button value={item.id} key={item.id} className="radio-avatar" onClick={() => setAvatar(item.id)}>
                                <img src={item.url} alt={`${item.id}avatar`} />
                            </Radio.Button>
                        ))}
                    </Radio.Group>
                </Form.Item>
                <Form.Item
                    name="agreement"
                    valuePropName="checked"
                    rules={[
                        {
                            validator: (_, value) => (value
                                ? Promise.resolve()
                                : Promise.reject(new Error(t('auth.register.agreementRequired')))),
                        },
                    ]}
                    wrapperCol={tailFormItemLayout.wrapperCol}
                >
                    <Checkbox>
                        {t('auth.register.agreementPre')} <a href="/article/6" target="_blank" rel="noopener noreferrer">{t('auth.register.agreementLink')}</a>
                    </Checkbox>
                </Form.Item>
                <Form.Item wrapperCol={tailFormItemLayout.wrapperCol}>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        {t('auth.register.submit')}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default connect(null, mapDispatchToProps)(Registration);
