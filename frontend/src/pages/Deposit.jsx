import React, { Component } from 'react';
import { Card, Form, Input, Button, Radio, Alert, Divider } from 'antd';
import { DollarOutlined, CreditCardOutlined } from '@ant-design/icons';

export default class Deposit extends Component {
    constructor(props) {
        super(props);
        this.state = {
            amount: '',
            paymentMethod: 'card',
        };
    }

    onFinish = (values) => {
        console.log('Deposit values:', values);
        // TODO: Implement payment logic
    };

    render() {
        return (
            <div className="depositpage">
                <h1 className="title">Поповнити рахунок</h1>
                
                <Alert
                    message="Мінімальна сума поповнення - 10 грн"
                    type="info"
                    showIcon
                    style={{ marginBottom: 20 }}
                />

                <Card className="blockstyle-first">
                    <Form
                        layout="vertical"
                        onFinish={this.onFinish}
                        initialValues={{
                            paymentMethod: 'card',
                        }}
                    >
                        <Form.Item
                            label="Сума поповнення"
                            name="amount"
                            rules={[
                                { required: true, message: 'Введіть суму' },
                                {
                                    validator: (_, value) => {
                                        if (value && value < 10) {
                                            return Promise.reject(
                                                'Мінімальна сума - 10 грн'
                                            );
                                        }
                                        return Promise.resolve();
                                    },
                                },
                            ]}
                        >
                            <Input
                                type="number"
                                prefix={<DollarOutlined />}
                                placeholder="Введіть суму"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Спосіб оплати"
                            name="paymentMethod"
                            rules={[{ required: true }]}
                        >
                            <Radio.Group size="large">
                                <Radio.Button value="card">
                                    <CreditCardOutlined /> Банківська карта
                                </Radio.Button>
                                <Radio.Button value="liqpay">LiqPay</Radio.Button>
                                <Radio.Button value="crypto">Криптовалюта</Radio.Button>
                            </Radio.Group>
                        </Form.Item>

                        <Divider />

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                className="color-green"
                                block
                            >
                                Поповнити
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                <Card
                    title="Швидке поповнення"
                    style={{ marginTop: 20 }}
                    className="blockstyle-first"
                >
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {[50, 100, 200, 500, 1000].map((amount) => (
                            <Button
                                key={amount}
                                size="large"
                                onClick={() =>
                                    this.setState({ amount: amount.toString() })
                                }
                            >
                                {amount} грн
                            </Button>
                        ))}
                    </div>
                </Card>
            </div>
        );
    }
}

