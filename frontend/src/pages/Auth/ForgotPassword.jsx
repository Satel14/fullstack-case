/* eslint-disable */
import React, { useState } from 'react'
import { Button, Modal, Form, Input } from "antd";


interface Values {
    title: string;
    description: string;
    modifier: string;
}

interface CollectionCreateFormProps {
    visible: boolean;
    onCreate: (value: Values) => void;
    onCancel: () => void;
}
const CollectionCreateForm: React.FC<CollectionCreateFormProps> = ({
    visible, onCreate, onCancel,
}) => {
    const [form] = Form.useForm();
    return (
        <Modal
            visible={visible}
            title="Нагадати пароль"
            okText="Згадати"
            cancelText="Закрити"
            onCancel={onCancel}
            onOk={() => {
                form
                    .validateFields().then((values) => {
                        form.resetFields()
                        onCreate(values)
                    })
                    .catch((info) => {
                        console.log("Validate failed", info);
                    })
            }}
        >
            <Form
                form={form}
                layout="vertical"
                name='form_in_modal'
                initialValues={{ modifier: "public" }}
            >
                <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                        {
                            type: "email",
                            message: "Це не почта",
                        },
                        {
                            required: true,
                            message: "Введіть почту"
                        },
                    ]}
                >
                    <Input />
                </Form.Item>
            </Form>
        </Modal>
    )
}

const ForgotPassword = () => {
    const [visible, setVisible] = useState(false)
    const onCreate = (values: any) => {
        console.log("Received values on form", values);
        setVisible(false)
    }
    return (
        <div style={{ display: "inline" }}>
            <Button
                type='link'
                onClick={() => {
                    setVisible(true)
                }}
            >
                Нагадати пароль
            </Button>
            <CollectionCreateForm
                visible={visible}
                onCreate={onCreate}
                onCancel={() => {
                    setVisible(false)
                }}
            />
        </div>
    )
}
export default ForgotPassword