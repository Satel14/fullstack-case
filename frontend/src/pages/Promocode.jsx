import React from 'react';
import {
    Form,
    Input,
    Button,
    Tooltip,
    Card,
} from 'antd';
import { connect } from 'react-redux';
import { usePromocodeFetch } from '../store/actions/user';
import openNotification from '../components/mini/openNotification';

const mapDispatchToProps = (dispatch) => ({
    usePromocodeFetch: (body) => dispatch(usePromocodeFetch(body)),
});

const Promocode = (props) => {
    const onFinish = (values) => {
        props
            .usePromocodeFetch({
                promocode: values.promocode,
            })
            .then((data) => {
                if (!data.balance) {
                    openNotification('error', 'Помилка', data.message);
                    return;
                }
                openNotification('success', 'Промокод активовано', data.message);
            })
            .catch(() => {
                openNotification('error', 'Помилка', 'Не вдалося активувати промокод');
            });
    };

    return (
        <div className="promocodepage">
            <h1 className="title">Промокоди</h1>
            <Card
                type="inner"
                title="Використати промокод"
                className="blockstyle-first"
                extra={(
                    <Tooltip
                        placement="top"
                        title="Беріть участь у роздачах від стрімерів або в групі CasesUA"
                    >
                        <a href="#">Де взяти?</a>
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
                        style={{ flex: 1 }}
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
        </div>
    );
};

export default connect(null, mapDispatchToProps)(Promocode);

