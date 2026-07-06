/* eslint-disable */
import React, { useState } from "react";
import {
    Form,
    Input,
    Checkbox,
    Button,
    Radio,
} from "antd";
import {userPostRegisterFetch} from "../../store/actions/user";
import {connect} from "react-redux";
import capitalize from "lodash/capitalize";
import openNotification from '../../components/mini/openNotification';
import { useTranslation } from 'react-i18next';


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
}

const Images = [
    {url: './img/avatars/1.png', id:1},
    {url: './img/avatars/2.png', id:2},
    {url: './img/avatars/3.png', id:3},
    {url: './img/avatars/4.png', id:4},
    {url: './img/avatars/5.png', id:5},
    {url: './img/avatars/6.png', id:6},
]

const mapDispatchToProps = (dispatch) => ({
    userPostRegisterFetch: (userInfo) => dispatch(userPostRegisterFetch(userInfo)),
});
const Registration = (props) => {
    const { t } = useTranslation();
    const [form] = Form.useForm()
    const [avatar, setAvatar] = useState(1);
    const [loading, setLoading] = useState(false);

    const onFinish = (values) => {
        setLoading(true);
        values.avatar = avatar;
        props.userPostRegisterFetch({
            login: values.username,
            password: values.password,
            email: values.email,
            avatar: values.avatar,
        }).then((errMessage) => {
            setLoading(false)
            if(errMessage) {
                openNotification('error', t('auth.register.errorTitle'), errMessage)
                return
            }
            props.history.push('/')
            openNotification('success', t('auth.register.successTitle'), t('auth.register.welcome', { name: capitalize(values.username) }))
        })
    }

    return (
        <div className="registrationpage">
            <h1 className="title">{t('auth.register.title')}</h1>
            <Form
                {...formItemLayout}
                form={form}
                name='register'
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
                        }
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
                        }
                    ]}
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item
                    name="confirm"
                    label={t('auth.register.confirmLabel')}
                    dependencies={["password"]}
                    hasFeedback
                    rules={[
                        {
                            required: true,
                            message: t('auth.register.confirmRequired'),
                        },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve()
                                }
                                return Promise.reject(new Error(t('auth.register.confirmMismatch')))
                            }
                        })
                    ]}>
                    <Input.Password />
                </Form.Item>
                <Form.Item
                    name="email"
                    label={t('auth.register.emailLabel')}
                    rules={[
                        {
                            type: "email",
                            message: t('auth.register.emailInvalid'),
                        },
                        {
                            required: true,
                            message: t('auth.register.emailRequired')
                        }
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item label={t('auth.register.chooseAvatar')}>
                        <Radio.Group defaultValue={avatar} buttonStyle="solid">
                        {Images.map((item)=>(
                            <Radio.Button value={item.id} key={item.id} className="radio-avatar" onClick={() => setAvatar(item.id)}>
                                    <img src={item.url} alt={item.id + "avatar"}/>
                            </Radio.Button>
                        ))}
                        </Radio.Group>
                </Form.Item>
                <Form.Item
                    name="agreement"
                    valuePropName="checked"
                    rules={[
                        {
                            validator: (_, value) =>
                                value
                                    ? Promise.resolve()
                                    : Promise.reject(new Error(t('auth.register.agreementRequired'))),
                        },
                    ]}
                    {...tailFormItemLayout}
                >
                        <Checkbox>
                            {t('auth.register.agreementPre')} <a href="">{t('auth.register.agreementLink')}</a>
                        </Checkbox>
                </Form.Item>
                <Form.Item {...tailFormItemLayout}>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            {t('auth.register.submit')}
                        </Button>
                </Form.Item>
            </Form>
        </div >
    )
}

export default connect(null, mapDispatchToProps)(Registration);
