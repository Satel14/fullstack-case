import React from 'react';
import {
 Form, Input, Button, Tooltip, Card,
} from 'antd';
import { connect } from 'react-redux';
import { usePromocodeFetch } from '../../store/actions/user';
import openNotification from '../mini/openNotification';

const mapDispatchToProps = (dispatch) => ({
  usePromocodeFetch: (body) => dispatch(usePromocodeFetch(body)),
});

const Promocode = (props) => {
  const onFinish = (values) => {
    // eslint-disable-next-line promise/catch-or-return
    props
      .usePromocodeFetch({
        promocode: values.promocode,
      })
      .then((data) => {
        // eslint-disable-next-line promise/always-return
        if (!data.balance) {
          openNotification('error', 'Помилка', data.message);
          return;
        }
        openNotification('success', 'Промокод активовано', data.message);
      });
  };

  return (
    <Card
      type="inner"
      title="Використати промокод"
      className="blockstyle-first"
      extra={(
        <Tooltip
          placement="top"
          title="Беріть участь у роздачах від стрімерів або в групі CasesUA"
        >
          <span style={{ color: '#fff' }}>Де взяти?</span>
        </Tooltip>
      )}
    >
      <Form
        initialValues={{ remember: true }}
        onFinish={onFinish}
        scrollToFirstError
        layout="inline"
      >
        <Form.Item
          name="promocode"
          rules={[{ required: true, message: 'Введіть промокод!' }]}
        >
          <Input placeholder="Введіть код" style={{ minWidth: '200px' }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" className="color-green">
            Відправити
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default connect(null, mapDispatchToProps)(Promocode);
