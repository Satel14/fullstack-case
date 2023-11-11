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


const mapDispatchToProps = (dispatch) => ({
        userPostFetch: (userInfo) => dispatch(userPostFetch(userInfo))
    })
const Login = (props) => {

    const [loading, setLoading] = useState(false);
    const onFinish = (values) => {
        setLoading(true);
        props.userPostFetch({
            login: values.username,
            password: values.password
        }).then((errMessage) => {
            setLoading(false)
            if (errMessage) {
                openNotification('error', 'Помилка', "Дані не вірні")
                return
            }
            props.history.push('/')
            openNotification('success', 'Успішний вхід', 'Ласкаво просимо на сайт ' + capitalize(values.username) + '!')
        })
    }
    return (
        <div className='loginpage'>
            <h1 className='title'>Авторизація</h1>
            <Form
                name="normal_login"
                className='login-form'
                initialValues={{ remember: true }}
                onFinish={onFinish}
                scrollToFirstError
            >
                <Form.Item
                    name="username"
                    label="Логін"
                    rules={[
                        { required: true, message: "Введіть ваш логін!" },
                        { min: 6, message: 'Мінімум 6 символів'}
                    ]}
                >
                    <Input
                        prefix={<UserOutlined className='site-form-item-icon' />}
                        placeholder="Username" />
                </Form.Item>
                <Form.Item
                    name="password"
                    label="Пароль"
                    rules={[
                        { required: true, message: "Введіть ваш пароль!" },
                        { min: 6, message: 'Мінімум 6 символів'}
                    ]}
                >
                    <Input
                        prefix={<LockOutlined className='site-form-item-icon' />}
                        placeholder="password"
                        type='password'
                    />
                </Form.Item>
                <Form.Item style={{ marginBottom: "10px" }}>
                    <Form.Item name='remember' valuePropName="checked" noStyle>
                        <Checkbox>Запам'ятати мене</Checkbox>
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
                        Увійти
                    </Button>
                    або
                    <Link to='/registration'>Зареєстуватися</Link>
                </Form.Item>
                <Form.Item>
                    <ForgotPassword/>
                </Form.Item>
            </Form>
        </div>
    )
}

export default connect(null, mapDispatchToProps)(Login);
