import React, { useRef, useState } from 'react';
import {
 Form, Input, Button, Tooltip, Card,
} from 'antd';
import { connect } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { redeemPromocodeFetch } from '../../store/actions/user';
import openNotification from '../mini/openNotification';

const mapDispatchToProps = (dispatch) => ({
  redeemPromocodeFetch: (body) => dispatch(redeemPromocodeFetch(body)),
});

const Promocode = (props) => {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const release = () => {
    inFlight.current = false;
    setPending(false);
  };
  const onFinish = (values) => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending(true);
    props
      .redeemPromocodeFetch({
        promocode: values.promocode,
      })
      .then((data) => {
        release();
        // eslint-disable-next-line promise/always-return
        if (!data.balance) {
          openNotification('error', t('promocode.errorTitle'), data.message);
          return;
        }
        openNotification('success', t('promocode.successTitle'), data.message);
      })
      .catch(() => {
        release();
        openNotification('error', t('promocode.errorTitle'), t('promocode.failed'));
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
          <Button type="primary" htmlType="submit" className="color-green" loading={pending}>
            {t('promocode.submit')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default connect(null, mapDispatchToProps)(Promocode);
