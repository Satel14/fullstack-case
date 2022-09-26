import React, { useState } from "react";
import {
    Form,
    Input,
    Cascader,
    Select,
    Row,
    Col,
    Checkbox,
    Button,
    AutoComplete,
} from "antd";

const { Option } = Select;

const formItemLayout = {
    labelCol: {
        xs: { span: 24 },
        sm: { span: 8 },
    },
    wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 },
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

const Registration = () => {
    const [form] = Form.useForm()

    const onFinish = (values: any) => {
        console.log("Received values of form: ", values);
    }
    const [autoCompleteResult, setAutoCompleteResult] = useState([])
    return (
        <div className="registratinpage">
            <h1 className="title">Регістрація</h1>
            <Form
                {...formItemLayout}
                form={form}
                name='register'
                onFinish={onFinish}
                scrollToFirstError
            >
                <Form.Item
                    name="nickname"
                    label="Логін"
                    rules={[
                        {
                            required: true,
                            message: "Придумайте логін",
                            whitespace: true,
                        }
                    ]}
                    hasFeedback
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name="password"
                    label="Пароль"
                    rules={[
                        {
                            required: true,
                            message: "Придумайте пароль",
                        }
                    ]}
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item
                    name="confirm"
                    label="Підтвердити пароль"
                    dependencies={["password"]}
                    hasFeedback
                    rules={[
                        {
                            required: true,
                            message: "Повторіть введений пароль",
                        },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve()
                                }
                                return Promise.reject(new Error("Пароль не співпадає"))
                            }
                        })
                    ]}>
                    <Input.Password />
                </Form.Item>
                <Form.Item
                    name="email"
                    label="E-mail"
                    rules={[
                        {
                            type: "email",
                            message: "Це не почта",
                        },
                        {
                            required: true,
                            message: "Введіть почту"
                        }
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name="agreement"
                    valuePropName="checked"
                    rules={[
                        {
                            validator: (_, value) =>
                                value
                                    ? Promise.resolve()
                                    : Promise.reject(new Error("Поставте галочку")),
                        },
                    ]}
                    {...tailFormItemLayout}
                >
                        <Checkbox>
                            Я згідний з <a href="">правилами сайту</a>
                        </Checkbox>
                </Form.Item>
                <Form.Item {...tailFormItemLayout}>
                        <Button type="primary" htmlType="submit">
                            Зареєструватися
                        </Button>
                </Form.Item>
            </Form>
        </div >
    )
}

export default Registration