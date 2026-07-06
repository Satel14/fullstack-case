import React, { useState } from 'react';
import {
 Button, Modal, Form, InputNumber,
} from 'antd';
import { DollarCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { sendMoneyForUser } from '../../api/all/profile';
import openNotification from '../mini/openNotification';

const CollectionCreateForm = ({
  visible,
  onCreate,
  onCancel,
  nickname,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  return (
    <Modal
      visible={visible}
      title={t('sendMoney.modalTitle', { nickname })}
      okText={t('sendMoney.transfer')}
      cancelText={t('sendMoney.close')}
      onCancel={onCancel}
      onOk={() => {
        form
          .validateFields()
          // eslint-disable-next-line promise/always-return
          .then((values) => {
            form.resetFields();
            onCreate(values);
          })
          .catch((info) => {
            // eslint-disable-next-line no-console
            console.log('Validate Failed:', info);
          });
      }}
    >
      <Form
        form={form}
        layout="vertical"
        name="form_in_modal"
        initialValues={{ modifier: 'public' }}
      >
        <Form.Item
          name="moneycount"
          label={t('sendMoney.amountLabel')}
          rules={[
            {
              required: true,
              message: t('sendMoney.amountRequired'),
            },
          ]}
        >
          <InputNumber />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const SendMoney = (props) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  const onCreate = async (values) => {
    await sendMoneyForUser({
      userIdTo: props.userIdTo,
      money_count: values.moneycount,
    }).then((result) => {
      if (result.sended === true) {
        openNotification('success', t('sendMoney.successTitle'), result.message);
        setVisible(false);
        if (window.HeaderSecond) {
          window.HeaderSecond.changeBalance(result.balance);
        }
      } else {
        openNotification('error', t('sendMoney.failTitle'), result.message);
      }
      return null;
    });
  };

  return (
    <div style={{ display: 'inline' }}>
      <Button
        type="link"
        icon={<DollarCircleOutlined />}
        className="send-money"
        onClick={() => {
          setVisible(true);
        }}
      >
        {t('sendMoney.trigger')}
      </Button>
      <CollectionCreateForm
        visible={visible}
        onCreate={onCreate}
        onCancel={() => {
          setVisible(false);
        }}
        nickname={props.nickname}
      />
    </div>
  );
};

export default SendMoney;
