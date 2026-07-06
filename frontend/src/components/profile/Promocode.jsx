import React from 'react';
import {
 Form, Input, Button, Tooltip, Card,
} from 'antd';
import { connect } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { usePromocodeFetch } from '../../store/actions/user';
import openNotification from '../mini/openNotification';

const mapDispatchToProps = (dispatch) => ({
  usePromocodeFetch: (body) => dispatch(usePromocodeFetch(body)),
});

const Promocode = (props) => {
  const { t } = useTranslation();
  const onFinish = (values) => {
    // eslint-disable-next-line promise/catch-or-return
    props
      .usePromocodeFetch({
        promocode: values.promocode,
      })
      .then((data) => {
        // eslint-disable-next-line promise/always-return
        if (!data.balance) {
          openNotification('error', t('promocode.errorTitle'), data.message);
          return;
        }
        openNotification('success', t('promocode.successTitle'), data.message);
      });
  };

  return (
    <Card
      type="inner"
      title={t('promocode.cardTitle')}
      className="blockstyle-first"
      extra={(
        <Tooltip
          placement="top"
          title={t('promocode.tooltip')}
        >
          <span style={{ color: '#fff' }}>{t('promocode.whereToGet')}</span>
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
          rules={[{ required: true, message: t('promocode.required') }]}
        >
          <Input placeholder={t('promocode.placeholder')} style={{ minWidth: '200px' }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" className="color-green">
            {t('promocode.submit')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default connect(null, mapDispatchToProps)(Promocode);
