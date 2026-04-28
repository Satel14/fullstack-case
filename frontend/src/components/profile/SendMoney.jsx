import React, { useState } from 'react';
import {
 Button, Modal, Form, InputNumber,
} from 'antd';
import { DollarCircleOutlined } from '@ant-design/icons';
import { sendMoneyForUser } from '../../api/all/profile';
import openNotification from '../mini/Notification';

const CollectionCreateForm = ({
  visible,
  onCreate,
  onCancel,
  nickname,
}) => {
  const [form] = Form.useForm();
  return (
    <Modal
      visible={visible}
      title={`Отправить деньги игроку ${nickname}`}
      okText="Перевести"
      cancelText="Закрыть"
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
          label="Количество денег"
          rules={[
            {
              required: true,
              message: 'Введите сумму!',
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
  const [visible, setVisible] = useState(false);

  const onCreate = async (values) => {
    await sendMoneyForUser({
      userIdTo: props.userIdTo,
      money_count: values.moneycount,
    }).then((result) => {
      if (result.sended === true) {
        openNotification('success', 'Деньги отправлены', result.message);
        setVisible(false);
        window.HeaderSecond.changeBalance(result.balance);
      } else {
        openNotification('error', 'Не получилось', result.message);
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
        Перевести деньги
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
