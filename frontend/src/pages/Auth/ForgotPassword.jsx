/* eslint-disable */
import React, { useState } from 'react'
import { Button, Modal, Form, Input } from "antd";
import { forgotPassword } from '../../api/all/user';
import openNotification from '../../components/mini/openNotification';


const CollectionCreateForm = ({
    visible, onCreate, onCancel,
}) => {
    const [form] = Form.useForm();
    return (
        <Modal
            open={visible}
            title="Нагадати пароль"
            okText="Згадати"
            cancelText="Закрити"
            onCancel={onCancel}
            onOk={() => {
                form
                    .validateFields()
                    .then((values) => {
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
    const [visible, setVisible] = useState(false);

    const onCreate = async (values) => {
        await forgotPassword(values.email).then((results) => {
            if(results.status === 'sended'){
                openNotification('success', "Успішно", results.message)
                setVisible(false);
                return;
            } else {
                openNotification('error', 'Помилка', results.message)
            }
        });
    };

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
    );
};
export default ForgotPassword
