import React from 'react'
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import ForgotPassword from "./ForgotPassword";
import { Link } from "react-router-dom";
import { Form, Input, Button, Checkbox } from "antd";
const Login = () => {
    const onFinish = (values: any) => {
        console.log("Received values of form: ", values);
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
                    rules={[{ required: true, message: "Введіть ваш логін!" }]}
                >
                    <Input
                        prefix={<UserOutlined className='site-form-item-icon' />}
                        placeholder="Username" />
                </Form.Item>
                <Form.Item
                    name="password"
                    label="Пароль"
                    rules={[{ required: true, message: "Введіть ваш пароль!" }]}
                >
                    <Input
                        prefix={<LockOutlined className='site-form-item-icon' />}
                        placeholder="password"
                        type='password'
                    />
                </Form.Item>
                <Form.Item style={{ marginBottom: "15px" }}>
                    <Form.Item name='remember' valuePropName="checked" noStyle>
                        <Checkbox>Запам'ятати мене</Checkbox>
                    </Form.Item>
                    <ForgotPassword />
                </Form.Item>
                <Form.Item>
                    <Button
                        type='primary'
                        htmlType='submit'
                        className='login-form-button'
                    >
                        Увійти
                    </Button>
                    або <Link to='/registration'>Зареєстуватися</Link>
                </Form.Item>
            </Form>
        </div>
    )
}

export default Login