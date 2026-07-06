/* eslint-disable */
import React, { useState } from 'react'
import { Button, Modal, Form, Input } from "antd";
import { useTranslation } from 'react-i18next';
import { forgotPassword } from '../../api/all/user';
import openNotification from '../../components/mini/openNotification';


const CollectionCreateForm = ({
    visible, onCreate, onCancel,
}) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    return (
        <Modal
            open={visible}
            title={t('auth.forgot.modalTitle')}
            okText={t('auth.forgot.ok')}
            cancelText={t('auth.forgot.cancel')}
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
                    label={t('auth.forgot.emailLabel')}
                    rules={[
                        {
                            type: "email",
                            message: t('auth.forgot.emailInvalid'),
                        },
                        {
                            required: true,
                            message: t('auth.forgot.emailRequired')
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
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    const onCreate = async (values) => {
        await forgotPassword(values.email).then((results) => {
            if(results.status === 'sended'){
                openNotification('success', t('auth.forgot.successTitle'), results.message)
                setVisible(false);
                return;
            } else {
                openNotification('error', t('auth.forgot.errorTitle'), results.message)
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
                {t('auth.forgot.trigger')}
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
