import React, { useRef, useState } from 'react';
import {
    Form,
    Input,
    Button,
    Tooltip,
    Card,
} from 'antd';
import { connect } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { redeemPromocodeFetch } from '../store/actions/user';
import openNotification from '../components/mini/openNotification';
import { promocodeText, serverText } from '../helpers/serverMessage';

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
                if (!data.balance) {
                    openNotification('error', t('promocode.errorTitle'), serverText(t, data) || t('promocode.failed'));
                } else {
                    openNotification('success', t('promocode.successTitle'), promocodeText(t, data));
                }
                return undefined;
            })
            .catch(() => {
                release();
                openNotification('error', t('promocode.errorTitle'), t('promocode.failed'));
            });
    };

    return (
        <div className="promocodepage">
            <h1 className="title">{t('promocode.pageTitle')}</h1>
            <Card
                type="inner"
                title={t('promocode.cardTitle')}
                className="blockstyle-first"
                extra={(
                    <Tooltip
                        placement="top"
                        title={t('promocode.tooltip')}
                    >
                        <Link to="/article/8">{t('promocode.whereToGet')}</Link>
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
                        style={{ flex: 1 }}
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
        </div>
    );
};

export default connect(null, mapDispatchToProps)(Promocode);
