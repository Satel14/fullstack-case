import React from 'react';
import {
    Form,
    Input,
    Button,
    Tooltip,
    Card,
} from 'antd';
import { connect } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { usePromocodeFetch } from '../store/actions/user';
import openNotification from '../components/mini/openNotification';

const mapDispatchToProps = (dispatch) => ({
    usePromocodeFetch: (body) => dispatch(usePromocodeFetch(body)),
});

const Promocode = (props) => {
    const { t } = useTranslation();
    const onFinish = (values) => {
        props
            .usePromocodeFetch({
                promocode: values.promocode,
            })
            .then((data) => {
                if (!data.balance) {
                    openNotification('error', t('promocode.errorTitle'), data.message);
                    return;
                }
                openNotification('success', t('promocode.successTitle'), data.message);
            })
            .catch(() => {
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
                        <a href="#">{t('promocode.whereToGet')}</a>
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
                        <Button type="primary" htmlType="submit" className="color-green">
                            {t('promocode.submit')}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default connect(null, mapDispatchToProps)(Promocode);

